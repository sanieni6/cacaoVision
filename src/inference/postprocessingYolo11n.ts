import { BoundingBox, Detection } from '../types/detection';
import { CLASS_LABELS, CLASS_LABELS_ES, NUM_CLASSES } from '../constants/classes';
import { INPUT_SIZE } from '../constants/models';

/**
 * Parse YOLO11n raw output: [1, 7, 8400]
 * Each anchor column: [cx, cy, w, h, score_c0, score_c1, score_c2]
 * Requires confidence filtering + NMS (IoU 0.45).
 *
 * Handles both pixel-space coords (0-640) and normalized coords (0-1).
 */
export function processYolo11nOutput(
  outputData: Float32Array,
  outputDims: number[],
  confidenceThreshold: number,
  iouThreshold: number,
  originalWidth: number,
  originalHeight: number
): Detection[] {
  const numValues = outputDims[1]; // 7 (4 box + 3 class scores)
  const numAnchors = outputDims[2]; // 8400

  // Debug: log raw data layout to understand coordinate space
  console.log(`[yolo11n] dims=[${outputDims.join(',')}], numValues=${numValues}, numAnchors=${numAnchors}`);
  console.log(`[yolo11n] origW=${originalWidth}, origH=${originalHeight}, INPUT_SIZE=${INPUT_SIZE}`);

  // Sample a few anchors to understand coordinate range
  const sampleIndices = [0, 1, 2, Math.floor(numAnchors / 2), numAnchors - 1];
  for (const idx of sampleIndices) {
    const vals = [];
    for (let v = 0; v < numValues; v++) {
      vals.push(outputData[v * numAnchors + idx].toFixed(4));
    }
    console.log(`[yolo11n] anchor[${idx}] raw: [${vals.join(', ')}]`);
  }

  // Auto-detect if coordinates are normalized (0-1) or pixel-space (0-640)
  // Sample cx values from first 100 anchors to determine scale
  let maxCoord = 0;
  for (let i = 0; i < Math.min(100, numAnchors); i++) {
    const cx = Math.abs(outputData[0 * numAnchors + i]);
    const cy = Math.abs(outputData[1 * numAnchors + i]);
    if (cx > maxCoord) maxCoord = cx;
    if (cy > maxCoord) maxCoord = cy;
  }

  // If max coordinate value is <= 1.5, it's normalized; otherwise pixel-space
  const isNormalized = maxCoord <= 1.5;
  const coordScale = isNormalized ? INPUT_SIZE : 1.0;
  console.log(`[yolo11n] maxCoord=${maxCoord.toFixed(4)}, isNormalized=${isNormalized}, coordScale=${coordScale}`);

  const scaleX = originalWidth / INPUT_SIZE;
  const scaleY = originalHeight / INPUT_SIZE;

  const candidates: Detection[] = [];

  for (let i = 0; i < numAnchors; i++) {
    // Output is [1, 7, 8400] - data is organized as 7 rows of 8400 values
    let cx = outputData[0 * numAnchors + i] * coordScale;
    let cy = outputData[1 * numAnchors + i] * coordScale;
    let w = outputData[2 * numAnchors + i] * coordScale;
    let h = outputData[3 * numAnchors + i] * coordScale;

    // Find best class score
    let maxScore = 0;
    let bestClassId = 0;
    for (let c = 0; c < NUM_CLASSES; c++) {
      const score = outputData[(4 + c) * numAnchors + i];
      if (score > maxScore) {
        maxScore = score;
        bestClassId = c;
      }
    }

    if (maxScore < confidenceThreshold) continue;

    // Debug: log first few candidates
    if (candidates.length < 3) {
      console.log(`[yolo11n] candidate: cx=${cx.toFixed(1)}, cy=${cy.toFixed(1)}, w=${w.toFixed(1)}, h=${h.toFixed(1)}, score=${maxScore.toFixed(3)}, class=${bestClassId}`);
    }

    // Convert center format to corner format and scale to original image
    const x1 = Math.max(0, (cx - w / 2) * scaleX);
    const y1 = Math.max(0, (cy - h / 2) * scaleY);
    const x2 = Math.min(originalWidth, (cx + w / 2) * scaleX);
    const y2 = Math.min(originalHeight, (cy + h / 2) * scaleY);

    candidates.push({
      box: { x1, y1, x2, y2 },
      confidence: maxScore,
      classId: bestClassId,
      className: CLASS_LABELS[bestClassId] || `class_${bestClassId}`,
      classNameEs: CLASS_LABELS_ES[bestClassId] || `clase_${bestClassId}`,
    });
  }

  console.log(`[yolo11n] ${candidates.length} candidates before NMS`);

  // Apply NMS
  return nms(candidates, iouThreshold);
}

/**
 * Non-Maximum Suppression.
 * Filters overlapping detections per class, keeping the highest confidence ones.
 */
function nms(detections: Detection[], iouThreshold: number): Detection[] {
  if (detections.length === 0) return [];

  // Sort by confidence descending
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
  const kept: Detection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;
    kept.push(sorted[i]);

    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;
      if (sorted[i].classId !== sorted[j].classId) continue;

      const iou = computeIoU(sorted[i].box, sorted[j].box);
      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  return kept;
}

/**
 * Compute Intersection over Union between two bounding boxes.
 */
function computeIoU(a: BoundingBox, b: BoundingBox): number {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (intersection === 0) return 0;

  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}
