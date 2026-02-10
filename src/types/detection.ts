export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  box: BoundingBox;
  confidence: number;
  classId: number;
  className: string;
  classNameEs: string;
}

export type ModelType = 'yolo26n' | 'yolo11n' | 'unknown';

export interface ModelInfo {
  uri: string;
  type: ModelType;
  fileName: string;
  fileSize?: number;
  loadedAt: Date;
}

export interface DetectionResult {
  detections: Detection[];
  processingTimeMs: number;
  imageUri: string;
  imageWidth: number;
  imageHeight: number;
  modelType: ModelType;
}
