import { Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraCapturedPicture, CameraType, FaceDetectionResult } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useEffect, useState, useRef } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, log } from 'react-native-reanimated'
import ViewShot, { captureRef, captureScreen } from 'react-native-view-shot'

import { styles } from './styles';
import api from '../../services/api';
import React from 'react';

interface IRecognitionResult {
  name: string;
  match_percentage: number;
  match_status: string;
}

export function Home() {
  let snapshotRef = useRef<ViewShot>()
  let cameraRef = useRef<Camera>();
  const [faceDetected, setFaceDetected] = useState(false);
  const [permission, requestPermission] = Camera.useCameraPermissions();
  const [identity, setIdentity] = useState<IRecognitionResult>({} as IRecognitionResult);
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
      let capturedSnapshot = await captureRef(cameraRef, {
        format: 'png',
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

    console.log("not identifying")
    if (face && !identity.name) {
      console.log("identifying");

      const { size, origin } = face.bounds;

      faceValues.value = {
        width: size.width,
        height: size.height,
        x: origin.x,
        y: origin.y,
      }

      takePic();

      try {
        let result = await api.post<IRecognitionResult>("identify", {
          data: snapshotImg
        }, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        console.log(result.data);
        setIdentity(result.data);

      } catch (error) {
        console.log(error)
      }

      setFaceDetected(true);
    }
  }

  async function handleConfirmation(confirmation: boolean) {
    console.log(confirmation);

    let confirmationString = confirmation+""

    console.log(confirmationString);

    await api.post("confirmation", {
      name: identity.name,
      confirmation: confirmationString
    }, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    identity.name = ""
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

      {
        identity.name &&
        <View style={styles.confirmation}>
          <View style={styles.confirmationContainerText}>
            <Text style={styles.confirmationText}>You are {identity.name}. Is it correct</Text>
          </View>
          <View style={styles.confirmationBox}>
            <TouchableOpacity style={styles.confirmationButton} onPress={() => handleConfirmation(true)}>
              <Text style={styles.confirmationButtonText}>Yes!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmationButtonNegation} onPress={() => handleConfirmation(false)}>
              <Text style={styles.confirmationButtonText}>No.</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    </View>
  );
}
