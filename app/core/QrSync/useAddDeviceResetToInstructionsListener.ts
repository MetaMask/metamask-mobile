import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

import Engine from '../Engine';
import type { AppNavigationProp } from '../NavigationService/types';
import { ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT } from './showExtensionCancelledErrorSheet';

interface UseAddDeviceResetToInstructionsListenerOptions {
  enabled?: boolean;
  navigation?: AppNavigationProp;
  shouldGoBack?: boolean;
  onReset?: () => void;
}

/**
 * Resets QR sync state when the extension-cancel sheet primary action is pressed.
 * Register in a single mounted screen per flow to avoid duplicate listeners.
 */
export const useAddDeviceResetToInstructionsListener = ({
  enabled = true,
  navigation,
  shouldGoBack = false,
  onReset,
}: UseAddDeviceResetToInstructionsListenerOptions = {}): void => {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const subscription = DeviceEventEmitter.addListener(
      ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT,
      () => {
        onReset?.();
        Engine.context.QrSyncController.resetState();

        if (shouldGoBack && navigation?.canGoBack()) {
          navigation.goBack();
        }
      },
    );

    return () => subscription.remove();
  }, [enabled, navigation, onReset, shouldGoBack]);
};
