import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ModelInfo, ModelType } from '../types/detection';
import {
  loadModelFromUri,
  unloadModel as unloadModelService,
  getModelInfo,
  overrideModelType,
} from '../inference/modelService';

const MODEL_URI_KEY = '@cacaovision/model_uri';
const MODEL_TYPE_KEY = '@cacaovision/model_type';

interface UseModelReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  modelInfo: ModelInfo | null;
  loadModel: (uri: string, overrideType?: ModelType) => Promise<void>;
  unloadModel: () => Promise<void>;
  setModelType: (type: ModelType) => void;
}

export function useModel(): UseModelReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Try to load the last used model on mount
  useEffect(() => {
    const loadLastModel = async () => {
      try {
        const savedUri = await AsyncStorage.getItem(MODEL_URI_KEY);
        const savedType = await AsyncStorage.getItem(MODEL_TYPE_KEY) as ModelType | null;

        if (savedUri) {
          setIsLoading(true);
          setError(null);
          const info = await loadModelFromUri(
            savedUri,
            savedType || undefined
          );
          setModelInfo(info);
          setIsLoaded(true);
        }
      } catch (err) {
        // Silently fail - user can manually import
        console.warn('Failed to load saved model:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLastModel();
  }, []);

  const loadModel = useCallback(async (uri: string, overrideType?: ModelType) => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await loadModelFromUri(uri, overrideType);
      setModelInfo(info);
      setIsLoaded(true);

      // Persist for next launch
      await AsyncStorage.setItem(MODEL_URI_KEY, uri);
      await AsyncStorage.setItem(MODEL_TYPE_KEY, info.type);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar el modelo';
      setError(message);
      setIsLoaded(false);
      setModelInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unloadModel = useCallback(async () => {
    await unloadModelService();
    setIsLoaded(false);
    setModelInfo(null);
    setError(null);

    await AsyncStorage.removeItem(MODEL_URI_KEY);
    await AsyncStorage.removeItem(MODEL_TYPE_KEY);
  }, []);

  const setModelType = useCallback((type: ModelType) => {
    overrideModelType(type);
    if (modelInfo) {
      const updated = { ...modelInfo, type };
      setModelInfo(updated);
      AsyncStorage.setItem(MODEL_TYPE_KEY, type);
    }
  }, [modelInfo]);

  return {
    isLoaded,
    isLoading,
    error,
    modelInfo,
    loadModel,
    unloadModel,
    setModelType,
  };
}
