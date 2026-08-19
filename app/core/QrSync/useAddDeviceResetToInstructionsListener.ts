import { useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { useMessenger } from '../../hooks/useMessenger';
import type { AppNavigationProp } from '../NavigationService/types';
import { ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT } from './showExtensionCancelledErrorSheet';
import type { RouteMessengerInstance } from './route-messenger';

interface UseAddDeviceResetToInstructionsListenerOptions {
  enabled?: boolean;
  navigation?: AppNavigationProp;
  shouldGoBack?: boolean;
  onReset?: () => void;
  /** Used when `shouldGoBack` is true but the stack cannot go back. */
  onNavigateBack?: () => void;
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
  onNavigateBack,
}: UseAddDeviceResetToInstructionsListenerOptions = {}): void => {
  const messenger = useMessenger<RouteMessengerInstance>();

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const subscription = DeviceEventEmitter.addListener(
      ADD_DEVICE_RESET_TO_INSTRUCTIONS_EVENT,
      () => {
        onReset?.();

        const resetAndNavigate = async () => {
          await messenger.call('QrSyncController:resetState');

          if (!shouldGoBack) {
            return;
          }

          if (navigation?.canGoBack()) {
            navigation.goBack();
            return;
          }

          onNavigateBack?.();
        };

        resetAndNavigate().catch(() => {
          // Reset failures are already reported by the controller path.
        });
      },
    );

    return () => subscription.remove();
  }, [enabled, messenger, navigation, onNavigateBack, onReset, shouldGoBack]);
};
