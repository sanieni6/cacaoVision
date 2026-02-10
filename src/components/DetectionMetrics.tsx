import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Detection, ModelType } from '../types/detection';
import { CLASS_COLORS, CLASS_LABELS_ES } from '../constants/classes';
import { CACAO_COLORS } from '../constants/colors';

interface DetectionMetricsProps {
  detections: Detection[];
  processingTimeMs: number;
  modelType: ModelType;
}

export default function DetectionMetrics({
  detections,
  processingTimeMs,
  modelType,
}: DetectionMetricsProps) {
  // Count detections per class
  const classCounts: Record<string, number> = {};
  for (const det of detections) {
    classCounts[det.className] = (classCounts[det.className] || 0) + 1;
  }

  const modelLabel = modelType === 'yolo26n' ? 'YOLO26n' : modelType === 'yolo11n' ? 'YOLO11n' : modelType;

  return (
    <View style={styles.container}>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{detections.length}</Text>
          <Text style={styles.summaryLabel}>Detecciones</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{processingTimeMs}</Text>
          <Text style={styles.summaryLabel}>ms</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumberSmall}>{modelLabel}</Text>
          <Text style={styles.summaryLabel}>Modelo</Text>
        </View>
      </View>

      {/* Per-class breakdown */}
      <Text style={styles.sectionTitle}>Detecciones por Clase</Text>
      <View style={styles.classBreakdown}>
        {Object.entries(CLASS_LABELS_ES).map(([id, label]) => {
          const classKey = id === '0' ? 'healthy' : id === '1' ? 'moniliasis' : 'black_pod';
          const count = classCounts[classKey] || 0;
          const color = CLASS_COLORS[classKey];

          return (
            <View key={id} style={styles.classRow}>
              <View style={[styles.classDot, { backgroundColor: color }]} />
              <Text style={styles.classLabel}>{label}</Text>
              <View style={[styles.classBadge, { backgroundColor: color + '20' }]}>
                <Text style={[styles.classBadgeText, { color }]}>{count}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Individual detections list */}
      {detections.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Detalle</Text>
          {detections.map((det, idx) => (
            <View key={idx} style={styles.detectionItem}>
              <View
                style={[
                  styles.detectionColor,
                  { backgroundColor: CLASS_COLORS[det.className] },
                ]}
              />
              <View style={styles.detectionInfo}>
                <Text style={styles.detectionClass}>{det.classNameEs}</Text>
                <Text style={styles.detectionConfidence}>
                  {Math.round(det.confidence * 100)}% confianza
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: CACAO_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: CACAO_COLORS.primary,
  },
  summaryNumberSmall: {
    fontSize: 16,
    fontWeight: '800',
    color: CACAO_COLORS.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: CACAO_COLORS.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: CACAO_COLORS.text,
    marginBottom: 10,
  },
  classBreakdown: {
    backgroundColor: CACAO_COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  classDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  classLabel: {
    flex: 1,
    fontSize: 14,
    color: CACAO_COLORS.text,
    fontWeight: '500',
  },
  classBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  detectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CACAO_COLORS.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  detectionColor: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  detectionInfo: {
    flex: 1,
  },
  detectionClass: {
    fontSize: 14,
    fontWeight: '600',
    color: CACAO_COLORS.text,
  },
  detectionConfidence: {
    fontSize: 12,
    color: CACAO_COLORS.textSecondary,
    marginTop: 2,
  },
});
