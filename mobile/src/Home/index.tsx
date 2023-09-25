import { View } from 'react-native';
import { Camera, CameraCapturedPicture, CameraType, FaceDetectionResult } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useEffect, useState, useRef } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, log } from 'react-native-reanimated'
import ViewShot, { captureScreen } from 'react-native-view-shot'

import { styles } from './styles';
import api from '../../services/api';
import React from 'react';

export function Home() {
  let snapshotRef = useRef<ViewShot>()
  let cameraRef = useRef<Camera>();
  const [faceDetected, setFaceDetected] = useState(false);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [counter, setCounter] = useState(0);
  const [image, setImage] = useState<CameraCapturedPicture>({} as CameraCapturedPicture);
  const [snapshotImg, setSnapshotImg] = useState<string>();

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
    try {
      let capturedSnapshot = await captureScreen({
        format: "jpg",
        quality: 0.8,
        result: "base64",
        width: 720,
        height: 720,
      });

      setSnapshotImg(capturedSnapshot);
    } catch (ex) {
      console.error(ex, "Some error have occurred");
    }

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
      
      try {
        console.log(api);

        let result = await api.post("identify", {
          data: snapshotImg
        }, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        console.log(result.data);

      } catch (error) {
        console.log(error)
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
          minDetectionInterval: 2000,
          tracking: true
        }}
      />
    </View>
  );
}


