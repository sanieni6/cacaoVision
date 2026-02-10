import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { documentDirectory, makeDirectoryAsync, copyAsync } from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import type { ModelType } from '../types/detection';
import { CACAO_COLORS } from '../constants/colors';

interface ModelSelectorProps {
  isLoading: boolean;
  modelType: ModelType | null;
  onLoadModel: (uri: string) => Promise<void>;
  onSetModelType: (type: ModelType) => void;
}

export default function ModelSelector({
  isLoading,
  modelType,
  onLoadModel,
  onSetModelType,
}: ModelSelectorProps) {
  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];

      // Validate file extension
      if (!asset.name.toLowerCase().endsWith('.onnx')) {
        alert('Por favor selecciona un archivo .onnx');
        return;
      }

      // Copy to app storage for persistence
      const destUri = `${documentDirectory}models/${asset.name}`;
      await makeDirectoryAsync(
        `${documentDirectory}models/`,
        { intermediates: true }
      );
      await copyAsync({ from: asset.uri, to: destUri });

      await onLoadModel(destUri);
    } catch (error) {
      console.error('Error importing model:', error);
      alert('Error al importar el modelo');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.importButton}
        onPress={handleImport}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={CACAO_COLORS.textOnPrimary} />
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={20} color={CACAO_COLORS.textOnPrimary} />
            <Text style={styles.importButtonText}>Importar Modelo</Text>
          </>
        )}
      </TouchableOpacity>

      {modelType === 'unknown' && (
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Seleccionar tipo de modelo:</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segment,
                modelType === 'unknown' && styles.segmentInactive,
              ]}
              onPress={() => onSetModelType('yolo26n')}
            >
              <Text style={styles.segmentText}>YOLO26n</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segment,
                modelType === 'unknown' && styles.segmentInactive,
              ]}
              onPress={() => onSetModelType('yolo11n')}
            >
              <Text style={styles.segmentText}>YOLO11n</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CACAO_COLORS.primaryLight,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  importButtonText: {
    color: CACAO_COLORS.textOnPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  toggleContainer: {
    backgroundColor: CACAO_COLORS.surface,
    padding: 14,
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 13,
    color: CACAO_COLORS.textSecondary,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: CACAO_COLORS.surfaceVariant,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: CACAO_COLORS.primary,
  },
  segmentInactive: {
    backgroundColor: CACAO_COLORS.surfaceVariant,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: CACAO_COLORS.text,
  },
});
