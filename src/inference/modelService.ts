import type { DetectionResult, ModelInfo, ModelType } from '../types/detection';
import { preprocessImage } from './imageUtils';
import { processYolo26nOutput } from './postprocessing';
import { processYolo11nOutput } from './postprocessingYolo11n';
import { detectModelType } from './modelDetector';
import { CONFIDENCE_THRESHOLD, IOU_THRESHOLD, INPUT_SIZE } from '../constants/models';

// Lazy-load onnxruntime-react-native to avoid crash in Expo Go
// The native module must exist before we require, because the module
// calls NativeModules.Onnxruntime.install() at init time which crashes
// fatally if the native module is null.
import { NativeModules } from 'react-native';

let ORT: typeof import('onnxruntime-react-native') | null = null;

function getORT(): typeof import('onnxruntime-react-native') {
  if (!ORT) {
    if (!NativeModules.Onnxruntime) {
      throw new Error(
        'ONNX Runtime no disponible. El módulo nativo no está instalado. Necesitas un dev build o production build para usar la inferencia.'
      );
    }
    ORT = require('onnxruntime-react-native');
  }
  return ORT!;
}

let session: any | null = null;
let currentModelInfo: ModelInfo | null = null;

/**
 * Load an ONNX model from a local file URI.
 * Auto-detects model type (yolo26n vs yolo11n).
 */
export async function loadModelFromUri(
  fileUri: string,
  overrideType?: ModelType
): Promise<ModelInfo> {
  // Unload previous model if any
  await unloadModel();

  const { InferenceSession } = getORT();

  try {
    session = await InferenceSession.create(fileUri);

    // Auto-detect or use override
    const detectedType = overrideType && overrideType !== 'unknown'
      ? overrideType
      : await detectModelType(session);

    // Extract filename from URI
    const fileName = fileUri.split('/').pop() || 'model.onnx';

    currentModelInfo = {
      uri: fileUri,
      type: detectedType,
      fileName,
      loadedAt: new Date(),
    };

    return currentModelInfo;
  } catch (error) {
    session = null;
    currentModelInfo = null;
    throw new Error(
      `Error al cargar el modelo: ${error instanceof Error ? error.message : 'Error desconocido'}`
    );
  }
}

/**
 * Run inference on an image.
 * Automatically uses the correct postprocessor based on detected model type.
 */
export async function runInference(
  imageUri: string,
  confidenceThreshold: number = CONFIDENCE_THRESHOLD
): Promise<DetectionResult> {
  if (!session || !currentModelInfo) {
    throw new Error('No hay modelo cargado. Importa un modelo ONNX primero.');
  }

  const { Tensor } = getORT();
  const startTime = Date.now();

  // Preprocess image
  console.log('[inference] starting preprocess...');
  const { inputTensor, originalWidth, originalHeight } = await preprocessImage(
    imageUri,
    INPUT_SIZE
  );
  console.log(`[inference] preprocess done: ${Date.now() - startTime}ms`);

  // Create input tensor
  const inputName = session.inputNames[0];
  const onnxTensor = new Tensor('float32', inputTensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const feeds: Record<string, any> = { [inputName]: onnxTensor };

  // Run inference
  console.log('[inference] running ONNX session.run...');
  const t1 = Date.now();
  const results = await session.run(feeds);
  console.log(`[inference] session.run done: ${Date.now() - t1}ms`);
  const outputName = session.outputNames[0];
  const outputTensor = results[outputName];
  const outputData = outputTensor.data as Float32Array;
  const outputDims = outputTensor.dims as number[];
  console.log(`[inference] output shape: [${outputDims.join(',')}], len=${outputData.length}`);

  // Process output based on model type
  let detections;
  if (currentModelInfo.type === 'yolo26n') {
    detections = processYolo26nOutput(
      outputData,
      outputDims,
      confidenceThreshold,
      originalWidth,
      originalHeight
    );
  } else if (currentModelInfo.type === 'yolo11n') {
    detections = processYolo11nOutput(
      outputData,
      outputDims,
      confidenceThreshold,
      IOU_THRESHOLD,
      originalWidth,
      originalHeight
    );
  } else {
    // Try yolo26n format as default
    detections = processYolo26nOutput(
      outputData,
      outputDims,
      confidenceThreshold,
      originalWidth,
      originalHeight
    );
  }

  console.log(`[inference] ${detections.length} detections found`);
  detections.forEach((d: any, i: number) => {
    console.log(`[det ${i}] ${d.classNameEs} ${(d.confidence * 100).toFixed(0)}% box=[${d.box.x1.toFixed(0)},${d.box.y1.toFixed(0)},${d.box.x2.toFixed(0)},${d.box.y2.toFixed(0)}]`);
  });

  const processingTimeMs = Date.now() - startTime;

  return {
    detections,
    processingTimeMs,
    imageUri,
    imageWidth: originalWidth,
    imageHeight: originalHeight,
    modelType: currentModelInfo.type,
  };
}

/**
 * Unload the current model from memory.
 */
export async function unloadModel(): Promise<void> {
  if (session) {
    session = null;
  }
  currentModelInfo = null;
}

/**
 * Get info about the currently loaded model.
 */
export function getModelInfo(): ModelInfo | null {
  return currentModelInfo;
}

/**
 * Check if a model is currently loaded.
 */
export function isModelLoaded(): boolean {
  return session !== null && currentModelInfo !== null;
}

/**
 * Override the model type (for manual toggle when auto-detection fails).
 */
export function overrideModelType(type: ModelType): void {
  if (currentModelInfo) {
    currentModelInfo = { ...currentModelInfo, type };
  }
}
