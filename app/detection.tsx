import React, { useMemo, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import type { Detection, ModelType } from '../src/types/detection';
import DetectionOverlay from '../src/components/DetectionOverlay';
import DetectionMetrics from '../src/components/DetectionMetrics';
import { CACAO_COLORS } from '../src/constants/colors';

export default function DetectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri: string;
    detections: string;
    processingTimeMs: string;
    modelType: string;
    imageWidth: string;
    imageHeight: string;
  }>();

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef<ViewShot>(null);
  const [isSaving, setIsSaving] = useState(false);

  const detections: Detection[] = useMemo(() => {
    try {
      return JSON.parse(params.detections || '[]');
    } catch {
      return [];
    }
  }, [params.detections]);

  const imageWidth = Number(params.imageWidth) || 640;
  const imageHeight = Number(params.imageHeight) || 640;
  const processingTimeMs = Number(params.processingTimeMs) || 0;
  const modelType = (params.modelType || 'unknown') as ModelType;

  const imageAspect = imageWidth / imageHeight;
  const headerHeight = 56;
  const buttonBarHeight = 82;
  const availableHeight = screenHeight - headerHeight - buttonBarHeight;

  const containerW = screenWidth;
  const containerH = availableHeight;

  // Compute actual rendered image rect within container (contain fit)
  let renderedW: number, renderedH: number;
  if (containerW / containerH > imageAspect) {
    renderedH = containerH;
    renderedW = containerH * imageAspect;
  } else {
    renderedW = containerW;
    renderedH = containerW / imageAspect;
  }
  const offsetX = (containerW - renderedW) / 2;
  const offsetY = (containerH - renderedH) / 2;

  // Hint arrow opacity
  const hintOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0.8, 0],
    extrapolate: 'clamp',
  });

  // Save image with bounding boxes to gallery
  const handleSaveImage = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso requerido',
          'Se necesita acceso a la galería para guardar la imagen.',
          [{ text: 'OK' }]
        );
        setIsSaving(false);
        return;
      }

      // Capture the view
      if (!viewShotRef.current?.capture) {
        throw new Error('ViewShot ref not ready');
      }
      const uri = await viewShotRef.current.capture();

      // Save to gallery
      await MediaLibrary.createAssetAsync(uri);

      Alert.alert(
        'Imagen guardada',
        'La imagen con detecciones se guardó en tu galería.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[save] Error:', error);
      Alert.alert(
        'Error',
        'No se pudo guardar la imagen. Intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  }, [isSaving]);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Image fills available screen */}
        <View style={[styles.imageContainer, { width: containerW, height: containerH }]}>
          {/* Background image fills entire container */}
          <Image
            source={{ uri: params.imageUri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
          {/* Capturable area: image + bounding boxes only */}
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'jpg', quality: 0.95 }}
            style={[
              styles.overlayPositioner,
              {
                left: offsetX,
                top: offsetY,
                width: renderedW,
                height: renderedH,
              },
            ]}
          >
            {/* Duplicate image inside ViewShot so capture includes it */}
            <Image
              source={{ uri: params.imageUri }}
              style={StyleSheet.absoluteFill}
              contentFit="fill"
            />
            <DetectionOverlay
              detections={detections}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              displayWidth={renderedW}
              displayHeight={renderedH}
            />
          </ViewShot>

          {/* Save button — top-right of image area */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveImage}
            disabled={isSaving}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaving ? 'hourglass' : 'download-outline'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Scroll hint */}
          <Animated.View style={[styles.scrollHint, { opacity: hintOpacity }]}>
            <Ionicons name="chevron-down" size={22} color="rgba(255,255,255,0.9)" />
          </Animated.View>
        </View>

        {/* Detection details appear when scrolling */}
        <View style={styles.metricsContainer}>
          <DetectionMetrics
            detections={detections}
            processingTimeMs={processingTimeMs}
            modelType={modelType}
          />
        </View>
      </Animated.ScrollView>

      {/* Action buttons pinned at bottom */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.back()}
        >
          <Ionicons name="refresh" size={20} color={CACAO_COLORS.textOnPrimary} />
          <Text style={styles.actionButtonText}>Nueva Detección</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CACAO_COLORS.background,
  },
  scrollContent: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: '#000',
    position: 'relative',
  },
  overlayPositioner: {
    position: 'absolute',
    overflow: 'hidden',
  },
  saveButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollHint: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsContainer: {
    paddingBottom: 8,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0D6CC',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CACAO_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: CACAO_COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
