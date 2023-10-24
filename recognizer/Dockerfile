FROM waleedshanaa/dlib-cv-image-sda

# RUN apt-get -y update
# RUN apt-get install -y --fix-missing \
#     build-essential \
#     cmake \
#     git \
#     # wget \
#     # curl \
#     # graphicsmagick \
#     # libgraphicsmagick1-dev \
#     libatlas-base-dev \
#     libavcodec-dev \
#     libavformat-dev \
#     libgtk2.0-dev \
#     libjpeg-dev \
#     liblapack-dev \
#     libswscale-dev \
#     pkg-config \
#     python3 \
#     python3-numpy \
#     python3-pip \
#     software-properties-common \
#     zip \
#     && apt-get clean && rm -rf /tmp/* /var/tmp/*

# RUN cd ~ && \
#     mkdir -p dlib && \
#     git clone -b 'v19.9' --single-branch https://github.com/davisking/dlib.git dlib/ && \
#     cd  dlib/ && \
#     python3 setup.py install --yes USE_AVX_INSTRUCTIONS

COPY . /app
WORKDIR /app
RUN pip3 install -r requirements.txt
CMD ["python3", "main.py"]