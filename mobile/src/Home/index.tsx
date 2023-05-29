import { View } from 'react-native';
import { Camera, CameraCapturedPicture, CameraPictureOptions, CameraType, FaceDetectionResult, ImageType } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useEffect, useState, useRef, useCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, log } from 'react-native-reanimated'

import { styles } from './styles';
import api from '../../services/api';
import mime from 'mime'

interface IIdentifiedPerson {
  name: string;
}

export function Home() {
  const cameraRef = useRef<Camera>();
  const [faceDetected, setFaceDetected] = useState(false);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [counter, setCounter] = useState(0);
  const [image, setImage] = useState<CameraCapturedPicture>({} as CameraCapturedPicture);

  const faceValues = useSharedValue({
    width: 0,
    height: 0,
    x: 0,
    y: 0
  });

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    zIndex: 1,
    width: faceValues.value.width,
    height: faceValues.value.height,
    transform: [
      { translateX: faceValues.value.x },
      { translateY: faceValues.value.y },
    ],
    borderColor: 'blue',
    borderWidth: 10,
  }));

  const takePicture = async () => {
    let options: CameraPictureOptions = {
      quality: 1,
      base64: true,
      exif: false,
      imageType: ImageType.jpg,
    };

    let newPhoto = await cameraRef.current.takePictureAsync(options);
    setImage(newPhoto);
  }

  async function handleFacesDetected({ faces }: FaceDetector.DetectionResult) {
    const face = faces[0] as FaceDetector.FaceFeature;
    setCounter(0);

    if (face) {
      console.log("vou processar")
      const { size, origin } = face.bounds;

      faceValues.value = {
        width: size.width,
        height: size.height,
        x: origin.x,
        y: origin.y,
      }

      setFaceDetected(true);

      // if (counter == 5) {
      await takePicture();

      const result = await fetch(image.uri);
      const blob = await result.blob();
      let file = new File([blob], "detectedFace.jpg")

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await api.post("identify", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          }
        });
        console.log("response:::", response)
        console.log(response.data);
      } catch (error) {
        console.error(error.toJSON())
        // console.error(error.config)

      }
      // }

      setFaceDetected(false);
      setCounter(counter + 1);
    }
  }

  useEffect(() => {
    requestPermission();
  }, []);

  if (!permission?.granted) {
    return;
  }

  return (
    <View style={styles.container}>
      {
        faceDetected && <Animated.View style={animatedStyle} />
      }
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.accurate,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 3000,
          tracking: true
        }}
      />
    </View>
  );
}


