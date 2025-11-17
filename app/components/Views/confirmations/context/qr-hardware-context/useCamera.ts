/* eslint-disable react-native/split-platform-components */
import { useState, useCallback, useEffect } from 'react';
import { PermissionsAndroid, AppStateStatus, AppState } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Device from '../../../../../util/device';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { HardwareDeviceTypes } from '../../../../../constants/keyringTypes';
import {
  PERMISSION_RESULT,
  PERMISSION_TYPE,
} from '../../../../../core/Analytics/MetaMetrics.events';

export const useCamera = (isSigningQRObject: boolean) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  // todo: integrate with alert system
  const [cameraError, setCameraError] = useState<string | undefined>();

  // ios handled camera perfectly in this situation, we just need to check permission with android.
  const [hasCameraPermission, setCameraPermission] = useState(Device.isIos());

  const checkAndroidCamera = useCallback(() => {
    if (Device.isAndroid() && !hasCameraPermission) {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA).then(
        (_hasPermission) => {
          trackEvent(
            createEventBuilder(
              MetaMetricsEvents.HARDWARE_WALLET_PERMISSION_REQUEST,
            )
              .addProperties({
                permission: PERMISSION_TYPE.CAMERA,
                result: _hasPermission
                  ? PERMISSION_RESULT.GRANTED
                  : PERMISSION_RESULT.DENIED,
                device_type: HardwareDeviceTypes.QR,
              })
              .build(),
          );
          setCameraPermission(_hasPermission);
          if (!_hasPermission) {
            trackEvent(
              createEventBuilder(
                MetaMetricsEvents.HARDWARE_WALLET_PERMISSION_REQUEST,
              )
                .addProperties({
                  permission: PERMISSION_TYPE.CAMERA,
                  result: PERMISSION_RESULT.LIMITED,
                  device_type: HardwareDeviceTypes.QR,
                })
                .build(),
            );
            setCameraError(strings('transaction.no_camera_permission_android'));
          } else {
            trackEvent(
              createEventBuilder(
                MetaMetricsEvents.HARDWARE_WALLET_PERMISSION_REQUEST,
              )
                .addProperties({
                  permission: PERMISSION_TYPE.CAMERA,
                  result: PERMISSION_RESULT.UNAVAILABLE,
                  device_type: HardwareDeviceTypes.QR,
                })
                .build(),
            );
            setCameraError(undefined);
          }
        },
      );
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
