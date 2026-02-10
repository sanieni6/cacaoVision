import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Detection } from '../types/detection';
import { CLASS_COLORS } from '../constants/classes';

interface DetectionOverlayProps {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  displayWidth: number;
  displayHeight: number;
}

export default function DetectionOverlay({
  detections,
  imageWidth,
  imageHeight,
  displayWidth,
  displayHeight,
}: DetectionOverlayProps) {
  const scaleX = displayWidth / imageWidth;
  const scaleY = displayHeight / imageHeight;

  return (
    <View
      style={[styles.overlay, { width: displayWidth, height: displayHeight }]}
      pointerEvents="none"
    >
      {detections.map((detection, index) => {
        const color = CLASS_COLORS[detection.className] || '#FFFFFF';
        const left = detection.box.x1 * scaleX;
        const top = detection.box.y1 * scaleY;
        const width = (detection.box.x2 - detection.box.x1) * scaleX;
        const height = (detection.box.y2 - detection.box.y1) * scaleY;
        const confidence = Math.round(detection.confidence * 100);

        // Place label inside top of box, or above if box is very small
        const labelTop = height > 30 ? top : Math.max(0, top - 24);

        return (
          <View key={index}>
            {/* Semi-transparent fill */}
            <View
              style={[
                styles.boxFill,
                {
                  left,
                  top,
                  width,
                  height,
                  backgroundColor: color + '18',
                },
              ]}
            />
            {/* Bounding box border */}
            <View
              style={[
                styles.box,
                {
                  left,
                  top,
                  width,
                  height,
                  borderColor: color,
                },
              ]}
            />
            {/* Label badge */}
            <View
              style={[
                styles.label,
                {
                  left,
                  top: labelTop,
                  backgroundColor: color,
                },
              ]}
            >
              <Text style={styles.labelText}>
                {detection.classNameEs} {confidence}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  boxFill: {
    position: 'absolute',
    borderRadius: 4,
  },
  box: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 4,
  },
  label: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
