import { PixelRatio, Text, TouchableOpacity, View } from 'react-native'
import { Camera, CameraType, type FaceDetectionResult } from 'expo-camera'
import * as FaceDetector from 'expo-face-detector'
import React, { useState, useRef, useCallback, useEffect } from 'react'

import { styles } from './styles'
import api from '../../services/api'
import { captureRef } from 'react-native-view-shot'

interface IRecognitionResult {
  id: string
  name: string
  match_percentage: number
  match_status: boolean
}

const initialDetectionInterval = 2000
const initialTolerance = 0.55
const targetPixelCount = 720
const pixelRatio = PixelRatio.get()
const pixels = targetPixelCount / pixelRatio

export function Home() {
  const cameraRef = useRef<Camera>()

  const [permission, requestPermission] = Camera.useCameraPermissions()

  const [identity, setIdentity] = useState<IRecognitionResult | null>(null)

  const [detectionInterval, setDetectionInterval] = useState(
    initialDetectionInterval,
  )

  const [tolerance, setTolerance] = useState(initialTolerance)

  const takePic = useCallback(async (): Promise<string> => {
    try {
      return await captureRef(cameraRef, {
        format: 'png',
        quality: 0.8,
        result: 'base64',
        width: pixels,
        height: pixels,
      })
    } catch (ex) {
      console.error(ex, 'Some error have occurred capturing the face image')
    }
  }, [])

  const handleFacesDetected = useCallback(
    async ({ faces }: FaceDetectionResult) => {
      const face = faces[0] as FaceDetector.FaceFeature
      // setFaceDetected(false)

      console.log('not identifying')
      if (face && !identity) {
        console.log('identifying')

        const capturedSnapshot = await takePic()
        console.log(tolerance)

        try {
          const { data } = await api.post<IRecognitionResult>(
            'identify',
            {
              data: capturedSnapshot,
              tolerance,
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
          setDetectionInterval(50000)
        } catch (error) {
          console.log(error)
        }
      }
    },
    [identity, takePic, tolerance],
  )

  const handleConfirmation = useCallback(
    async (confirmation: boolean) => {
      if (!identity) return

      console.log('sending confirmations')

      await api.post(
        'confirmation',
        {
          id: identity.id,
          name: identity.name,
          confirmation: confirmation ? 'yes' : 'no',
        },
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      )

      if (!confirmation) {
        const reducedTolerance = tolerance - 0.05
        setTolerance(reducedTolerance)
      } else {
        setTolerance(initialTolerance)
      }

      setIdentity(null)
      setDetectionInterval(initialDetectionInterval)
    },
    [identity, tolerance],
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
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={CameraType.front}
        onFacesDetected={handleFacesDetected}
        faceDetectorSettings={{
          mode: FaceDetector.FaceDetectorMode.accurate,
          detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
          runClassifications: FaceDetector.FaceDetectorClassifications.none,
          minDetectionInterval: detectionInterval,
          tracking: true,
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
