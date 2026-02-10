import type { Detection, ModelType } from './detection';

export interface DetectionRouteParams {
  imageUri: string;
  detections: string; // JSON-serialized Detection[]
  processingTimeMs: number;
  modelType: ModelType;
  imageWidth: number;
  imageHeight: number;
}
