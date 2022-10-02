import torch

from detectron2.data import MetadataCatalog
from detectron2.engine.defaults import DefaultPredictor
from detectron2.utils.visualizer import ColorMode, Visualizer

from detectron2.config import get_cfg

# CONFIG_FILE = './configs/fcos/fcos_imprv_R_101_FPN.yaml'
CONFIG_FILE = './configs/fcos/fcos_imprv_R_101_FPN_cpu.yaml'
CONFIDENCE_THRESHOLD = 0.5

def setup_cfg():
    #Load default config
    cfg = get_cfg()
    #Merge the default with customized one
    cfg.merge_from_file(CONFIG_FILE)
    #Set score_threshold for builtin models
    cfg.MODEL.RETINANET.SCORE_THRESH_TEST = CONFIDENCE_THRESHOLD
    cfg.MODEL.ROI_HEADS.SCORE_THRESH_TEST = CONFIDENCE_THRESHOLD
    cfg.MODEL.FCOS.INFERENCE_TH = CONFIDENCE_THRESHOLD
    cfg.freeze()
    return cfg


class VisualizationDemo(object):
    def __init__(self, instance_mode=ColorMode.IMAGE):
        """
        Args:
            instance_mode (ColorMode):
            parallel (bool): whether to run the model in different processes from visualization.
                Useful since the visualization logic can be slow.
        """
        self.cfg = setup_cfg()
        self.metadata = MetadataCatalog.get(
            self.cfg.DATASETS.TEST[0] if len(self.cfg.DATASETS.TEST) else "__unused"
        )
        self.cpu_device = torch.device("cpu")
        self.instance_mode = instance_mode

        self.predictor = DefaultPredictor(self.cfg)

    def run_on_image(self, image, click_point):
        """
        Args:
            image (np.ndarray): an image of shape (H, W, C) (in BGR order).
                This is the format used by OpenCV.
            click_point (tuple: (y,x)): where user clicked on selected region.
                It's used to select one and remove other objects.
        Returns:
            predictions (dict): the output of the model.
            vis_output (VisImage): the visualized image output.
        """
        vis_output = None
        predictions = self.predictor(image, click_point)
        # Convert image from OpenCV BGR format to Matplotlib RGB format.
        image = image[:, :, ::-1]

        mask = predictions['instances'].raw_masks.squeeze(1).data.cpu().numpy() \
            if predictions['instances'].has("raw_masks") else None
        mask_bo = predictions['instances'].pred_masks_bo.squeeze(1).data.cpu().numpy() \
            if predictions['instances'].has("pred_masks_bo") else None
        bound_bo = predictions['instances'].pred_bounds_bo.squeeze(1).data.cpu().numpy() \
            if predictions['instances'].has("pred_bounds_bo") else None
        bound = predictions['instances'].pred_bounds.squeeze(1).data.cpu().numpy() \
            if predictions['instances'].has("pred_bounds") else None

        visualizer = Visualizer(image, self.metadata, instance_mode=self.instance_mode)
        if "instances" in predictions:
            instances = predictions["instances"].to(self.cpu_device)
            vis_output = visualizer.draw_instance_predictions(predictions=instances)

        return predictions, vis_output

