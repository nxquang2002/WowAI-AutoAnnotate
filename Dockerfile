FROM python:3.9.14-slim-buster
WORKDIR /app
RUN apt-get update -y
RUN apt-get install -y gcc g++ git python3-opencv
ENV PYTHONPATH "${PYTHONPATH}:/app"
COPY ./requirements.txt /app/requirements.txt
COPY . /app
RUN pip install -r requirements.txt
EXPOSE 8080
CMD  ["python", "server.py"]
