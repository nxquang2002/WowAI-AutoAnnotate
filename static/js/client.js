const MAX_WIDTH = 600;
const MAX_HEIGHT = 600;
const MAX_MODAL_WIDTH = 500;
const MAX_MODAL_HEIGHT = 500;
const areaThreshold = 512;

var imageLoader = document.getElementById('imageLoader');
    imageLoader.addEventListener("change", handleImage, false);
var canvas = document.getElementById('imageCanvas');
var context = canvas.getContext("2d");
context.font = "20px Arial";
context.textAlign = "center";
context.fillText("No image available", canvas.width/2, canvas.height/2);

var modalCanvas = document.getElementById('modalCanvas');
var modalContext = modalCanvas.getContext('2d');

var image = null, original_image = null;
var polygons = [];
var topleft = {}, botright = {};
var drawing = false;

var scaleFactor = 1.1;
var ratio = 1, modalRatio = 1;



function drawImageScaled(img, canvas=canvas, max_width=MAX_WIDTH, max_height=MAX_HEIGHT) {
    var context = canvas.getContext('2d');
    if(img.width < max_width && img.height < max_height){
        ratio = 1;
    }
    else{
        var hRatio = max_width / img.width;
        var vRatio =  max_height / img.height;
        ratio  = Math.min( hRatio, vRatio );
    }
    canvas.width = img.width*ratio
    canvas.height = img.height*ratio;
    context.clearRect(0,0,canvas.width, canvas.height);
    context.drawImage(img, 0,0, img.width, img.height,
                  0,0,img.width*ratio, img.height*ratio);
}

function handleImage(e){
    var fileReader = new FileReader();
    fileReader.readAsDataURL(e.target.files[0]);
    fileReader.onload = function(event){
        image = new Image();
        original_image = new Image();
        original_image.src = image.src = event.target.result;
        reset();
        image.onload = function(){
//            canvas.width = image.width;
//            canvas.height = image.height;
//            context.drawImage(image, 0, 0);
              drawImageScaled(image, canvas=canvas, max_width=MAX_WIDTH, max_height=MAX_HEIGHT);
        }
    }
}

function reset(){
    topleft = botright = {};
    polygons = [];
    drawing = false;
}

function changeCanvasImage(base64_image){
    image.src = base64_image;
    image.onload = function(){
//        canvas.width = image.width;
//        canvas.height = image.height;
//        context.drawImage(image, 0, 0)
        drawImageScaled(image, canvas, MAX_WIDTH, MAX_HEIGHT);
    }
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect(),
    scaleX = canvas.width / rect.width,
    scaleY = canvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left.toFixed()) * scaleX,
        y: (evt.clientY - rect.top.toFixed()) * scaleY
    }
}

function handleMouseDown(e){
    if(image){
        if(window.event.ctrlKey){
            e.preventDefault();
            var {x,y} = getMousePos(canvas, e);
            x = Math.round(x/ratio);
            y = Math.round(y/ratio);
            var imageURL = original_image.src;
            removeMask(imageURL, [y,x])
        }
        else if(window.event.shiftKey){
            if(e.button == 0){
                // Left mousedown
                e.preventDefault();
                var {x,y} = getMousePos(canvas, e);
                x = Math.round(x/ratio);
                y = Math.round(y/ratio);
                var imageURL = original_image.src;
                includeClick(imageURL, [y,x])
            }
        }
        else if(window.event.altKey){
            if(e.button == 0){
                e.preventDefault();
                var {x,y} = getMousePos(canvas, e);
                x = Math.round(x/ratio);
                y = Math.round(y/ratio);
                var imageURL = original_image.src;
                excludeClick(imageURL, [y,x])
            }
        }
        else{
            if(!drawing){
                drawing = true;
                topleft = getMousePos(canvas, e);
                canvas.style.cursor = "crosshair";
            }
        }
    }
}

function handleMouseUp(e){
    if(drawing){
        drawing = false;
        botright = getMousePos(canvas, e);
        canvas.style.cursor = "pointer";

        //In case topleft is under (or to the right) of botright
        if(topleft.x > botright.x){
            var temp = topleft.x;
            topleft.x = botright.x;
            botright.x = temp
        }
        if(topleft.y > botright.y){
            var temp = topleft.y;
            topleft.y = botright.y;
            botright.y = temp;
        }

        botright.x = Math.min(botright.x, canvas.width);
        botright.y = Math.min(botright.y, canvas.height);
        topleft.x = Math.max(topleft.x, 0);
        topleft.y = Math.max(topleft.y, 0);

        topleft.x = Math.round(topleft.x/ratio);
        topleft.y = Math.round(topleft.y/ratio);
        botright.x = Math.round(botright.x/ratio);
        botright.y = Math.round(botright.y/ratio);

        area = (botright.x - topleft.x) * (botright.y - topleft.y)
        if(area > areaThreshold){
            //If selected region > area_threshold
            showModalImage(image);
//            context.clearRect(0, 0, this.width, this.height);
//            context.drawImage(image, 0, 0);
            context.clearRect(0, 0, canvas.width,canvas.height);
            context.drawImage(image, 0,0, image.width, image.height,
                  0,0,image.width*ratio, image.height*ratio);
        }
        else if(area > 32){
            //If area < threshold but still big enough to be considered
            window.alert("Selected region is too small!");
            context.clearRect(0, 0, this.width, this.height);
            context.drawImage(image, 0, 0);
        }
        else{
            //If area is too small, just ignore it
        }
    }
}

function handleMouseMove(e){
    if(drawing){
        var {x,y} = getMousePos(canvas, e);
        context.clearRect(0, 0, canvas.width, canvas.height);
//        context.drawImage(image, 0, 0);
        context.drawImage(image, 0,0, image.width, image.height,
                  0,0,image.width*ratio, image.height*ratio);
        context.fillStyle = "rgba(30, 144, 255, 0.5)";
        context.fillRect(topleft.x, topleft.y, x - topleft.x, y - topleft.y);
    }
}

var mouseX = 0, mouseY = 0;
var originX = 0, originY = 0;
var currentzoom = 1, scale = 1;
function handleMouseWheel(event){
    if(window.event.ctrlKey){
        event.preventDefault();
        var wheel = event.wheelDelta/120;
        var zoom = 0;
        if(wheel < 0){
            zoom = 1/2;
            if(currentzoom == 1)
            return;
        }
        else{
            mouseX = event.clientX - canvas.offsetLeft;
            mouseY = event.clientY - canvas.offsetTop;
            zoom = 2;
            if(currentzoom == 16)
                return;
        }

        currentzoom *= zoom;
        context.translate(originX, originY);
        context.scale(zoom, zoom);
        context.translate(
            -( mouseX / scale + originX - mouseX / ( scale * zoom ) ),
            -( mouseY / scale + originY - mouseY / ( scale * zoom ) )
        );
        originX = ( mouseX / scale + originX - mouseX / ( scale * zoom ) );
        originY = ( mouseY / scale + originY - mouseY / ( scale * zoom ) );
        scale *= zoom;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);
    }
}



canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("mouseup", handleMouseUp);
canvas.addEventListener("mousemove", handleMouseMove);
canvas.addEventListener("mousewheel", handleMouseWheel);
//canvas.addEventListener("click", handleClick)

modalCanvas.addEventListener("mousedown", handleModalCanvasMouseDown);

function showModalImage(image){
    var width = botright.x - topleft.x
    var height = botright.y - topleft.y;

    if(width > MAX_MODAL_WIDTH || height > MAX_MODAL_HEIGHT){
        var hRatio = MAX_MODAL_WIDTH / width;
        var vRatio =  MAX_MODAL_HEIGHT / height;
        modalRatio  = Math.min( hRatio, vRatio );
    }
    else{
        modalRatio = 1;
    }

    modalCanvas.width = width*modalRatio;
    modalCanvas.height = height*modalRatio;
    modalContext.drawImage(image, topleft.x, topleft.y, width, height, 0, 0, width*modalRatio, height*modalRatio);
    $(".modal").modal('show');
}

function handleModalCanvasMouseDown(e){
    var {x,y} = getMousePos(modalCanvas, e);

    modalContext.beginPath();
    modalContext.arc(x, y, 8, 0, 2*Math.PI, false)
    modalContext.fillStyle = "#7FFF00";
    modalContext.fill();

    $(".modal").modal('hide')
    var imageURL = original_image.src;
    x = Math.round(x/modalRatio);
    y = Math.round(y/modalRatio);
    predictImage(imageURL, [topleft.y, topleft.x, botright.y, botright.x], [y, x]);
}


function predictImage(image, vertices, clickpoint){
    fetch("/predict", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image,
            vertices,
            clickpoint,
            polygons
        })
    })
    .then(res =>{
        if(res.ok)
            res.json().then(data =>{
                changeCanvasImage(data.image);
                polygons = data.polygons;
                generateList(polygons);
            });
    })
    .catch(e =>{
        console.log("Error occured", e.message);
        window.alert("Something went wrong!");
    });
}

function removeMask(image, clickpoint){
    fetch("/remove",{
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image,
            clickpoint,
            polygons
        })
    })
    .then(res =>{
        if(res.ok){
            res.json().then(data =>{
                changeCanvasImage(data.image);
                polygons = data.polygons;
                generateList(polygons);
            });
        };
    })
    .catch(e =>{
        console.log("Error occured", e.message);
        window.alert("Something went wrong!");
    });
}

function includeClick(image, clickpoint){
    fetch("/include", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image,
            clickpoint,
            polygons
        })
    })
    .then(res =>{
        if(res.ok){
            res.json().then(data =>{
                changeCanvasImage(data.image);
                polygons = data.polygons;
                generateList(polygons);
            });
        };
    })
    .catch(e =>{
        console.log("Error occured", e.message);
        window.alert("Something went wrong!");
    });
}

function excludeClick(image, clickpoint){
    fetch("/exclude", {
        method: "POST",
        headers:{
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image,
            clickpoint,
            polygons
        })
    })
    .then(res =>{
        if(res.ok){
            res.json().then(data =>{
                changeCanvasImage(data.image);
                polygons = data.polygons;
                generateList(polygons);
            });
        };
    })
    .catch(e =>{
        console.log("Error occured", e.message);
        window.alert("Something went wrong!");
    });
}

function generateList(polygons){
    var panelContent = document.getElementById("panelContent");
    panelContent.innerHTML = "";

    polygons.forEach((ele, idx) => {
        var newRow = document.createElement("div");
        newRow.className = "item";
        newRow.innerText = "Object " + (idx+1).toString() + ": {" + ele.toString() +"}";
        panelContent.appendChild(newRow);
    })

    var panelFooter = document.getElementById("panelFooter");
    panelFooter.innerText = "Counts: " + polygons.length.toString();
}