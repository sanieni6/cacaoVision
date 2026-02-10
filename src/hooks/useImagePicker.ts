import { useState, useCallback, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

interface UseImagePickerReturn {
  pickFromCamera: () => Promise<string | null>;
  pickFromGallery: () => Promise<string | null>;
  permissionStatus: PermissionStatus;
  requestPermissions: () => Promise<void>;
}

export function useImagePicker(): UseImagePickerReturn {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const cameraStatus = await Camera.getCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (cameraStatus.granted && mediaStatus.granted) {
      setPermissionStatus('granted');
    } else if (cameraStatus.status === 'denied' || mediaStatus.status === 'denied') {
      setPermissionStatus('denied');
    } else {
      setPermissionStatus('undetermined');
    }
  };

  const requestPermissions = useCallback(async () => {
    const cameraResult = await Camera.requestCameraPermissionsAsync();
    const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraResult.granted && mediaResult.granted) {
      setPermissionStatus('granted');
    } else {
      setPermissionStatus('denied');
    }
  }, []);

  const pickFromCamera = useCallback(async (): Promise<string | null> => {
    // Request permission if needed
    const { granted } = await Camera.requestCameraPermissionsAsync();
    if (!granted) {
      setPermissionStatus('denied');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    return result.assets[0].uri;
  }, []);

  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      setPermissionStatus('denied');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    return result.assets[0].uri;
  }, []);

  return {
    pickFromCamera,
    pickFromGallery,
    permissionStatus,
    requestPermissions,
  };
}
