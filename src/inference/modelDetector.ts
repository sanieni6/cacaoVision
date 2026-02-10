import type { ModelType } from '../types/detection';

/**
 * Auto-detect model type by running a dummy inference
 * and inspecting the output tensor shape.
 *
 * YOLO26n: [1, 300, 6] -- end-to-end with NMS
 * YOLO11n: [1, 7, 8400] -- raw anchors, needs NMS
 *
 * Accepts an already-created InferenceSession (typed as `any`
 * so callers don't need to import onnxruntime at the top level).
 */
export async function detectModelType(
  session: any
): Promise<ModelType> {
  try {
    // Lazy-require so the module is never imported at the top level
    const { Tensor } = require('onnxruntime-react-native');

    const inputName = session.inputNames[0];
    const dummyData = new Float32Array(1 * 3 * 640 * 640); // zeros
    const dummyTensor = new Tensor('float32', dummyData, [1, 3, 640, 640]);

    const feeds: Record<string, any> = { [inputName]: dummyTensor };
    const results = await session.run(feeds);
    const outputName = session.outputNames[0];
    const shape = results[outputName].dims;

    // YOLO26n: [1, 300, 6] -- end-to-end with NMS
    if (shape.length === 3 && shape[1] === 300 && shape[2] === 6) {
      return 'yolo26n';
    }

    // YOLO11n: [1, 7, 8400] -- raw anchors, needs NMS
    if (shape.length === 3 && shape[1] === 7 && shape[2] === 8400) {
      return 'yolo11n';
    }

    return 'unknown';
  } catch (error) {
    console.warn('Model type detection failed:', error);
    return 'unknown';
  }
}
