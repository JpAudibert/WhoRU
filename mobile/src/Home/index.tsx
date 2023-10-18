import { Text, TouchableOpacity, View } from 'react-native'
import { Camera, CameraType, type FaceDetectionResult } from 'expo-camera'
import * as FaceDetector from 'expo-face-detector'
import React, { useState, useRef, useCallback, useEffect } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated'
// import { captureRef } from 'react-native-view-shot'

import { styles } from './styles'
import api from '../../services/api'
import { captureRef } from 'react-native-view-shot'

interface IRecognitionResult {
  name: string
  match_percentage: number
  match_status: boolean
}

const initialDetectionInterval = 2000

export function Home() {
  const cameraRef = useRef<Camera>()

  const [permission, requestPermission] = Camera.useCameraPermissions()

  const [faceDetected, setFaceDetected] = useState(false)
  const [identity, setIdentity] = useState<IRecognitionResult | null>(null)

  const [detectionInterval, setDetectionInterval] = useState(
    initialDetectionInterval,
  )

  const faceValues = useSharedValue({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
  })

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
  }))

  const takePic = useCallback(async (): Promise<string> => {
    try {
      return await captureRef(cameraRef, {
        format: 'png',
        quality: 0.8,
        result: 'base64',
        width: 720,
        height: 720,
      })
    } catch (ex) {
      console.error(ex, 'Some error have occurred capturing the face image')
    }
  }, [])

  const handleFacesDetected = useCallback(
    async ({ faces }: FaceDetectionResult) => {
      const face = faces[0] as FaceDetector.FaceFeature
      setFaceDetected(false)

      console.log('not identifying')
      if (face && !identity) {
        console.log('identifying')

        const { size, origin } = face.bounds

        faceValues.value = {
          width: size.width,
          height: size.height,
          x: origin.x,
          y: origin.y,
        }

        const capturedSnapshot = await takePic()

        console.log('image base64', capturedSnapshot.slice(0, 100))

        try {
          const { data } = await api.post<IRecognitionResult>(
            'identify',
            {
              data: capturedSnapshot,
            },
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            },
          )

          if (!data.match_status) {
            console.log('no match found')
            return
          }

          console.log('request data', data)
          setIdentity(data)
          setDetectionInterval(20000)
        } catch (error) {
          console.log(error)
        }

        setFaceDetected(true)
      }
    },
    [faceValues, identity, takePic],
  )

  const handleConfirmation = useCallback(
    async (confirmation: boolean) => {
      console.log(confirmation)

      if (!identity) return

      console.log('sending confirmations')

      await api.post(
        'confirmation',
        {
          name: identity.name,
          confirmation: confirmation ? 'yes' : 'no',
        },
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      )

      setIdentity(null)
      setDetectionInterval(initialDetectionInterval)
    },
    [identity],
  )

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission()
    }
  }, [requestPermission, permission])

  if (!permission?.granted) {
    return null
  }

  return (
    <View style={styles.container}>
      {faceDetected && <Animated.View style={animatedStyle} />}
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.accurate,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
          runClassifications: FaceDetector.FaceDetectorClassifications.all,
          minDetectionInterval: detectionInterval,
          tracking: false,
        }}
      />

      {identity && (
        <View style={styles.confirmation}>
          <View style={styles.confirmationContainerText}>
            <Text style={styles.confirmationText}>
              You are {identity.name}. Is it correct?
            </Text>
          </View>
          <View style={styles.confirmationBox}>
            <TouchableOpacity
              style={styles.confirmationButton}
              onPress={() => {
                handleConfirmation(true)
              }}
            >
              <Text style={styles.confirmationButtonText}>Yes!</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmationButtonNegation}
              onPress={() => {
                handleConfirmation(false)
              }}
            >
              <Text style={styles.confirmationButtonText}>No.</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}
