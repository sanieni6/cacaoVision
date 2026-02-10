import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ModelInfo } from '../types/detection';
import { CACAO_COLORS } from '../constants/colors';

interface ModelStatusBadgeProps {
  modelInfo: ModelInfo | null;
  isLoading: boolean;
}

export default function ModelStatusBadge({ modelInfo, isLoading }: ModelStatusBadgeProps) {
  const isLoaded = modelInfo !== null;

  return (
    <View style={styles.container}>
      <View style={[styles.dot, isLoaded ? styles.dotGreen : styles.dotRed]} />
      <View style={styles.textContainer}>
        {isLoading ? (
          <Text style={styles.statusText}>Cargando modelo...</Text>
        ) : isLoaded ? (
          <>
            <Text style={styles.statusText}>{modelInfo.fileName}</Text>
            <Text style={styles.typeText}>
              {modelInfo.type === 'yolo26n'
                ? 'YOLO26n (End-to-End)'
                : modelInfo.type === 'yolo11n'
                  ? 'YOLO11n (con NMS)'
                  : 'Tipo desconocido'}
            </Text>
          </>
        ) : (
          <Text style={styles.statusText}>Sin modelo cargado</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CACAO_COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  dotGreen: {
    backgroundColor: CACAO_COLORS.success,
  },
  dotRed: {
    backgroundColor: CACAO_COLORS.error,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: CACAO_COLORS.text,
  },
  typeText: {
    fontSize: 12,
    color: CACAO_COLORS.textSecondary,
    marginTop: 2,
  },
});
