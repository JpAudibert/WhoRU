FROM waleedshanaa/dlib-cv-image-sda

RUN mkdir -p /app

COPY . /app

WORKDIR /app

RUN pip3 install -r requirements.txt

CMD ["python3", "main.py"]