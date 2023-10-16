import { Text, TouchableOpacity, View } from 'react-native';
import { Camera, CameraType, FaceDetectionResult } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import { useEffect, useState, useRef } from 'react';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { captureRef } from 'react-native-view-shot'

import { styles } from './styles';
import api from '../../services/api';
import React from 'react';

interface IRecognitionResult {
  name: string;
  match_percentage: number;
  match_status: string;
}

const initialRecognitionResult: IRecognitionResult = {
  name: "",
  match_percentage: 0,
  match_status: "false",
};

export function Home() {
  let cameraRef = useRef<Camera>();

  const [permission, requestPermission] = Camera.useCameraPermissions();

  const [faceDetected, setFaceDetected] = useState(false);
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
      console.error(ex, "Some error have occurred capturing the face image");
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
        let { data } = await api.post<IRecognitionResult>("identify", {
          data: snapshotImg
        }, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        console.log(data);
        setIdentity(data);
      } catch (error) {
        console.log(error)
      }

      setFaceDetected(true);
      setSnapshotImg("");
    }
  }

  async function handleConfirmation(confirmation: boolean) {
    console.log(confirmation);

    let confirmationString = confirmation + ""

    console.log(confirmationString);

    await api.post("confirmation", {
      name: identity.name,
      confirmation: confirmationString
    }, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    setIdentity(initialRecognitionResult);
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
        type={CameraType.back}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.accurate,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: 2000,
          tracking: false,
        }}
      />

      {
        !!identity.name &&
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
