/* eslint-disable react-native/split-platform-components */
import { useState, useCallback, useEffect } from 'react';
import { PermissionsAndroid, AppStateStatus, AppState } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';

export const useCamera = (isSigningQRObject: boolean) => {
  // todo: integrate with alert system
  const [cameraError, setCameraError] = useState<string | undefined>();

  // ios handled camera perfectly in this situation, we just need to check permission with android.
  const [hasCameraPermission, setCameraPermission] = useState(Device.isIos());

  const checkAndroidCamera = useCallback(() => {
    if (Device.isAndroid() && !hasCameraPermission) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA).then(
        (_hasPermission) => {
          setCameraPermission(_hasPermission);
          if (!_hasPermission) {
            setCameraError(strings('transaction.no_camera_permission_android'));
          } else {
            setCameraError(undefined);
          }
        },
      );
    }
  }, [hasCameraPermission]);

  const handleAppState = useCallback(
    (appState: AppStateStatus) => {
      if (appState === 'active') {
        checkAndroidCamera();
      }
    },
    [checkAndroidCamera],
  );

  useEffect(() => {
    if (!isSigningQRObject) {
      return;
    }
    checkAndroidCamera();
  }, [checkAndroidCamera, isSigningQRObject]);

  useEffect(() => {
    if (!isSigningQRObject) {
      return;
    }
    const appStateListener = AppState.addEventListener(
      'change',
      handleAppState,
    );
    return () => {
      appStateListener.remove();
    };
  }, [handleAppState, isSigningQRObject]);

  return { cameraError, hasCameraPermission };
};
