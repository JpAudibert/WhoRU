import { View } from 'react-native';
import { Camera, CameraCapturedPicture, CameraType, FaceDetectionResult } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useEffect, useState, useRef } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, log } from 'react-native-reanimated'

import { styles } from './styles';
import api from '../../services/api';
import React from 'react';

export function Home() {
  let cameraRef = useRef<Camera>();
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

  async function takePic() {
    let options = { quality: 1, base64: true, exif: false };

    let newImage = await cameraRef.current.takePictureAsync(options);
    setImage(newImage);
  };

  async function handleFacesDetected({ faces }: FaceDetectionResult) {
    const face = faces[0] as FaceDetector.FaceFeature;
    setFaceDetected(false);

    if (face) {
      const { size, origin } = face.bounds;

      faceValues.value = {
        width: size.width,
        height: size.height,
        x: origin.x,
        y: origin.y,
      }

      takePic();

      let formData = new FormData();
      formData.append('file', image.uri);

      // await api.get("/api/v1/faces/test");

      console.log(formData);

      try {
        await api.post("/api/v1/faces/identify", formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      } catch (error) {
        console.error(error)        
      }

      setFaceDetected(true);
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
          minDetectionInterval: 5000,
          tracking: true
        }}
      />
    </View>
  );
}


