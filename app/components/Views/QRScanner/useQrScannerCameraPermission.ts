import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';

interface UseQrScannerCameraPermissionOptions {
  isActive: boolean;
}

export function useQrScannerCameraPermission({
  isActive,
}: UseQrScannerCameraPermissionOptions) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [permissionCheckCompleted, setPermissionCheckCompleted] =
    useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refreshCameraPermission = useCallback(async () => {
    if (!isActive || hasPermission) {
      return;
    }

    try {
      await requestPermission();
    } finally {
      setPermissionCheckCompleted(true);
    }
  }, [hasPermission, isActive, requestPermission]);

  useEffect(() => {
    if (hasPermission) {
      setPermissionCheckCompleted(true);
      return;
    }

    if (!permissionCheckCompleted) {
      refreshCameraPermission();
    }
  }, [hasPermission, permissionCheckCompleted, refreshCameraPermission]);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        const hasReturnedToForeground =
          (appState.current === 'inactive' ||
            appState.current === 'background') &&
          nextAppState === 'active';

        appState.current = nextAppState;

        if (hasReturnedToForeground && !hasPermission) {
          refreshCameraPermission();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [hasPermission, isActive, refreshCameraPermission]);

  return {
    hasPermission,
    permissionCheckCompleted,
    requestPermission: refreshCameraPermission,
  };
}
