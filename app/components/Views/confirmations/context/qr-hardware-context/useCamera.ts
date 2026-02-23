/* eslint-disable react-native/split-platform-components */
import { useState, useCallback, useEffect } from 'react';
import { PermissionsAndroid, AppStateStatus, AppState } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { HardwareDeviceTypes } from '../../../../../constants/keyringTypes';
import {
  PERMISSION_RESULT,
  PERMISSION_TYPE,
} from '../../../../../core/Analytics/MetaMetrics.events';

export const useCamera = (isSigningQRObject: boolean) => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  // todo: integrate with alert system
  const [cameraError, setCameraError] = useState<string | undefined>();

  // ios handled camera perfectly in this situation, we just need to check permission with android.
  const [hasCameraPermission, setCameraPermission] = useState(Device.isIos());

  const checkAndroidCamera = useCallback(async () => {
    if (!Device.isAndroid() || hasCameraPermission) {
      return;
    }

    const alreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );

    if (alreadyGranted) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_PERMISSION_REQUEST)
          .addProperties({
            permission: PERMISSION_TYPE.CAMERA,
            result: PERMISSION_RESULT.GRANTED,
            device_type: HardwareDeviceTypes.QR,
          })
          .build(),
      );
      setCameraPermission(true);
      setCameraError(undefined);
      return;
    }

    const requestResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    const granted = requestResult === PermissionsAndroid.RESULTS.GRANTED;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_PERMISSION_REQUEST)
        .addProperties({
          permission: PERMISSION_TYPE.CAMERA,
          result: granted
            ? PERMISSION_RESULT.GRANTED
            : PERMISSION_RESULT.DENIED,
          device_type: HardwareDeviceTypes.QR,
        })
        .build(),
    );

    setCameraPermission(granted);
    if (!granted) {
      setCameraError(strings('transaction.no_camera_permission_android'));
    } else {
      setCameraError(undefined);
    }
  }, [hasCameraPermission, trackEvent, createEventBuilder]);

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
