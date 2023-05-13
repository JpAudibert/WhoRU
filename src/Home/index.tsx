import { View } from 'react-native';
import { Camera, CameraType, FaceDetectionResult } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useEffect, useState } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, log } from 'react-native-reanimated'

import { styles } from './styles';

export function Home() {
  const [faceDetected, setFaceDetected] = useState(false);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [counter, setCounter] = useState(0);

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

  function handleFacesDetected({ faces }: FaceDetectionResult) {
    const face = faces[0] as any;
    setFaceDetected(false);

    if (face) {
      const { size, origin } = face.bounds;

      faceValues.value = {
        width: size.width,
        height: size.height,
        x: origin.x,
        y: origin.y,
      }

      if (counter == 5) {
        
      }

      setCounter(counter + 1);
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
        style={styles.camera}
        type={CameraType.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.accurate,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 100,
          tracking: true,
        }}
      />
    </View>
  );
}


