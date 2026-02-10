import { Detection } from '../types/detection';
import { CLASS_LABELS, CLASS_LABELS_ES } from '../constants/classes';
import { INPUT_SIZE } from '../constants/models';

/**
 * Parse YOLO26n end-to-end output: [1, 300, 6]
 * Each detection: [x1, y1, x2, y2, confidence, class_id]
 * No NMS needed -- already applied inside the model.
 */
export function processYolo26nOutput(
  outputData: Float32Array,
  outputDims: number[],
  confidenceThreshold: number,
  originalWidth: number,
  originalHeight: number
): Detection[] {
  const maxDetections = outputDims[1]; // 300
  const valuesPerDet = outputDims[2];  // 6
  const scaleX = originalWidth / INPUT_SIZE;
  const scaleY = originalHeight / INPUT_SIZE;
  const detections: Detection[] = [];

  for (let i = 0; i < maxDetections; i++) {
    const offset = i * valuesPerDet;
    const confidence = outputData[offset + 4];
    if (confidence < confidenceThreshold) continue;

    const classId = Math.round(outputData[offset + 5]);
    if (classId < 0 || classId >= CLASS_LABELS.length) continue;

    detections.push({
      box: {
        x1: Math.max(0, outputData[offset + 0] * scaleX),
        y1: Math.max(0, outputData[offset + 1] * scaleY),
        x2: Math.min(originalWidth, outputData[offset + 2] * scaleX),
        y2: Math.min(originalHeight, outputData[offset + 3] * scaleY),
      },
      confidence: Math.min(1, confidence),
      classId,
      className: CLASS_LABELS[classId] || `class_${classId}`,
      classNameEs: CLASS_LABELS_ES[classId] || `clase_${classId}`,
    });
  }

  return detections;
}
