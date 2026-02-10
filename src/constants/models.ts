export const INPUT_SIZE = 640;
export const CHANNELS = 3;
export const CONFIDENCE_THRESHOLD = 0.25;
export const IOU_THRESHOLD = 0.45;

export const MODEL_TYPES = {
  YOLO26N: 'yolo26n',
  YOLO11N: 'yolo11n',
  UNKNOWN: 'unknown',
} as const;
