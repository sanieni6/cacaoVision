import { useState, useCallback } from 'react';
import type { DetectionResult } from '../types/detection';
import { runInference } from '../inference/modelService';
import { CONFIDENCE_THRESHOLD } from '../constants/models';

interface UseDetectionReturn {
  result: DetectionResult | null;
  isProcessing: boolean;
  error: string | null;
  detect: (imageUri: string) => Promise<DetectionResult | null>;
  clear: () => void;
}

export function useDetection(): UseDetectionReturn {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detect = useCallback(async (imageUri: string): Promise<DetectionResult | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      const detectionResult = await runInference(imageUri, CONFIDENCE_THRESHOLD);
      setResult(detectionResult);
      return detectionResult;
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Error durante la detección';
      setError(message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    isProcessing,
    error,
    detect,
    clear,
  };
}
