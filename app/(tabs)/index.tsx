import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useModel } from '../../src/hooks/useModel';
import { useDetection } from '../../src/hooks/useDetection';
import { useImagePicker } from '../../src/hooks/useImagePicker';
import ImageSourceSheet from '../../src/components/ImageSourceSheet';
import ModelStatusBadge from '../../src/components/ModelStatusBadge';
import ModelSelector from '../../src/components/ModelSelector';
import EmptyState from '../../src/components/EmptyState';
import { CACAO_COLORS } from '../../src/constants/colors';

export default function HomeScreen() {
  const router = useRouter();
  const [sheetVisible, setSheetVisible] = useState(false);

  const { isLoaded, isLoading, error, modelInfo, loadModel, setModelType } = useModel();
  const { detect, isProcessing, error: detectionError } = useDetection();
  const { pickFromCamera, pickFromGallery } = useImagePicker();

  const handleDetectPress = useCallback(() => {
    if (!isLoaded) {
      Alert.alert(
        'Sin modelo',
        'Importa un modelo ONNX para comenzar la detección.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSheetVisible(true);
  }, [isLoaded]);

  const handleImageSelected = useCallback(
    async (imageUri: string | null) => {
      setSheetVisible(false);

      if (!imageUri) return;

      const result = await detect(imageUri);
      if (result) {
        router.push({
          pathname: '/detection',
          params: {
            imageUri: result.imageUri,
            detections: JSON.stringify(result.detections),
            processingTimeMs: result.processingTimeMs.toString(),
            modelType: result.modelType,
            imageWidth: result.imageWidth.toString(),
            imageHeight: result.imageHeight.toString(),
          },
        });
      }
    },
    [detect, router]
  );

  const handleCamera = useCallback(async () => {
    const uri = await pickFromCamera();
    await handleImageSelected(uri);
  }, [pickFromCamera, handleImageSelected]);

  const handleGallery = useCallback(async () => {
    const uri = await pickFromGallery();
    await handleImageSelected(uri);
  }, [pickFromGallery, handleImageSelected]);

  return (
    <View style={styles.container}>
      {/* Model status section */}
      <View style={styles.modelSection}>
        <ModelStatusBadge modelInfo={modelInfo} isLoading={isLoading} />
        <ModelSelector
          isLoading={isLoading}
          modelType={modelInfo?.type ?? null}
          onLoadModel={loadModel}
          onSetModelType={setModelType}
        />
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color={CACAO_COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Main action area */}
      <View style={styles.mainArea}>
        {!isLoaded && !isLoading ? (
          <EmptyState />
        ) : (
          <View style={styles.cacaoIconContainer}>
            <Ionicons name="leaf" size={80} color={CACAO_COLORS.primaryLight} />
          </View>
        )}

        {/* Detect button */}
        <TouchableOpacity
          style={[
            styles.detectButton,
            !isLoaded && styles.detectButtonDisabled,
          ]}
          onPress={handleDetectPress}
          disabled={!isLoaded || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={CACAO_COLORS.textOnPrimary} />
          ) : (
            <>
              <Ionicons
                name="scan"
                size={24}
                color={CACAO_COLORS.textOnPrimary}
              />
              <Text style={styles.detectButtonText}>Detectar Enfermedad</Text>
            </>
          )}
        </TouchableOpacity>

        {isProcessing && (
          <Text style={styles.processingText}>Analizando imagen...</Text>
        )}

        {detectionError && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color={CACAO_COLORS.error} />
            <Text style={styles.errorText}>{detectionError}</Text>
          </View>
        )}

        {!isLoaded && !isLoading && (
          <Text style={styles.hintText}>
            Importa un modelo ONNX para habilitar la detección
          </Text>
        )}
      </View>

      {/* Bottom sheet for image source selection */}
      <ImageSourceSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CACAO_COLORS.background,
  },
  modelSection: {
    padding: 16,
    gap: 12,
  },
  mainArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cacaoIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: CACAO_COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CACAO_COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
    width: '100%',
    maxWidth: 320,
    elevation: 4,
    shadowColor: CACAO_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  detectButtonDisabled: {
    backgroundColor: CACAO_COLORS.primaryLight,
    opacity: 0.6,
    elevation: 0,
    shadowOpacity: 0,
  },
  detectButtonText: {
    color: CACAO_COLORS.textOnPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  processingText: {
    marginTop: 16,
    fontSize: 14,
    color: CACAO_COLORS.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CACAO_COLORS.error + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: CACAO_COLORS.error,
    flex: 1,
  },
  hintText: {
    marginTop: 16,
    fontSize: 13,
    color: CACAO_COLORS.textSecondary,
    textAlign: 'center',
  },
});
