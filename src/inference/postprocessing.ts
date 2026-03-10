import { Detection } from '../types/detection';
import { CLASS_LABELS, CLASS_LABELS_ES } from '../constants/classes';
import { INPUT_SIZE } from '../constants/models';

/**
 * Parse YOLO26n end-to-end output: [1, 300, 6]
 * Each detection: [x1, y1, x2, y2, confidence, class_id]
 * No NMS needed -- already applied inside the model.
 *
 * Auto-detects coordinate space:
 *   - Normalized [0,1] → multiply by original dims
 *   - Input pixel space [0,640] → scale from 640 to original dims
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
  const detections: Detection[] = [];

  // Auto-detect coordinate space by sampling valid detections' box values
  let maxCoord = 0;
  for (let i = 0; i < maxDetections; i++) {
    const offset = i * valuesPerDet;
    const conf = outputData[offset + 4];
    if (conf < confidenceThreshold) continue;
    for (let j = 0; j < 4; j++) {
      const v = Math.abs(outputData[offset + j]);
      if (v > maxCoord) maxCoord = v;
    }
  }

  // If max box coordinate <= 1.5, coords are normalized [0,1]
  // If max box coordinate is in ~INPUT_SIZE range, coords are in input pixel space
  const isNormalized = maxCoord > 0 && maxCoord <= 1.5;
  const scaleX = isNormalized
    ? originalWidth        // normalized → multiply directly by original size
    : originalWidth / INPUT_SIZE;  // pixel-space → scale from 640 to original
  const scaleY = isNormalized
    ? originalHeight
    : originalHeight / INPUT_SIZE;

  console.log(
    `[yolo26n] maxCoord=${maxCoord.toFixed(4)}, isNormalized=${isNormalized}, ` +
    `scaleX=${scaleX.toFixed(2)}, scaleY=${scaleY.toFixed(2)}, ` +
    `origW=${originalWidth}, origH=${originalHeight}`
  );

  for (let i = 0; i < maxDetections; i++) {
    const offset = i * valuesPerDet;
    const confidence = outputData[offset + 4];
    if (confidence < confidenceThreshold) continue;

    const classId = Math.round(outputData[offset + 5]);
    if (classId < 0 || classId >= CLASS_LABELS.length) continue;

    // Debug: log raw values for first few detections
    if (detections.length < 3) {
      console.log(
        `[yolo26n] raw det[${i}]: x1=${outputData[offset].toFixed(4)}, ` +
        `y1=${outputData[offset + 1].toFixed(4)}, x2=${outputData[offset + 2].toFixed(4)}, ` +
        `y2=${outputData[offset + 3].toFixed(4)}, conf=${confidence.toFixed(4)}, cls=${classId}`
      );
    }

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
