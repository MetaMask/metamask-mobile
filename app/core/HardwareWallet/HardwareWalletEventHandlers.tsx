/* eslint-disable no-console */
import { useCallback } from 'react';
import {
  HardwareWalletError,
  ErrorCode,
  HardwareWalletType,
  HardwareWalletConnectionState,
  DeviceEvent,
  DeviceEventPayload,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';
import {
  HardwareWalletStateSetters,
  HardwareWalletRefs,
} from './HardwareWalletStateManager';
import { parseErrorByType, createHardwareWalletError } from './errors';

/**
 * Options for the device event handlers hook
 */
export interface UseDeviceEventHandlersOptions {
  refs: HardwareWalletRefs;
  setters: HardwareWalletStateSetters;
  walletType: HardwareWalletType | null;
}

/**
 * Return type of the useDeviceEventHandlers hook
 */
export interface DeviceEventHandlersResult {
  /** Update the connection state with change detection */
  updateConnectionState: (newState: HardwareWalletConnectionState) => void;
  /** Handle device events from the adapter */
  handleDeviceEvent: (payload: DeviceEventPayload) => void;
  /** Handle errors and update connection state */
  handleError: (error: unknown) => void;
  /** Clear any error state */
  clearError: () => void;
}

/**
 * Hook to handle device events from hardware wallet adapters.
 *
 * This hook provides handlers for all device events emitted by adapters,
 * translating them into connection state updates.
 *
 * @example
 * ```typescript
 * const { handleDeviceEvent, handleError, clearError } = useDeviceEventHandlers({
 *   refs,
 *   setters,
 *   walletType: HardwareWalletType.Ledger,
 * });
 *
 * // Use in adapter options
 * const adapter = createAdapter(walletType, {
 *   onDeviceEvent: handleDeviceEvent,
 *   onDisconnect: (error) => error && handleError(error),
 * });
 * ```
 */
export const useDeviceEventHandlers = ({
  refs,
  setters,
  walletType,
}: UseDeviceEventHandlersOptions): DeviceEventHandlersResult => {
  /**
   * Update connection state with change detection to avoid unnecessary re-renders
   */
  const updateConnectionState = useCallback(
    (newState: HardwareWalletConnectionState) => {
      setters.setConnectionState((prev) => {
        // Avoid unnecessary updates if status hasn't changed
        // For error states, always update since the error might be different
        if (prev.status === newState.status && newState.status !== 'error') {
          return prev;
        }
        return newState;
      });
    },
    [setters],
  );

  /**
   * Handle errors by parsing them and updating connection state.
   *
   * Note: If the adapter's flowComplete flag is true (success was shown),
   * we still parse the error but don't update the connection state to avoid
   * showing error UI after the user has already seen success.
   */
  const handleError = useCallback(
    (error: unknown) => {
      let hwError: HardwareWalletError;

      if (error instanceof HardwareWalletError) {
        hwError = error;
      } else {
        // Use parseErrorByType which handles unknown errors
        hwError = parseErrorByType(
          error,
          walletType ?? HardwareWalletType.Ledger,
        );
      }

      updateConnectionState({
        status: ConnectionStatus.ErrorState,
        error: hwError,
      });

      // Reset connecting flag
      refs.isConnectingRef.current = false;
    },
    [updateConnectionState, walletType, refs],
  );

  /**
   * Clear error state and return to disconnected
   */
  const clearError = useCallback(() => {
    setters.setConnectionState((prev) => {
      if (prev.status === 'error') {
        return { status: ConnectionStatus.Disconnected };
      }
      return prev;
    });
  }, [setters]);

  /**
   * Main event handler for device events from adapters
   */
  const handleDeviceEvent = useCallback(
    (payload: DeviceEventPayload) => {
      switch (payload.event) {
        case DeviceEvent.Connected:
          if (payload.deviceId) {
            setters.setDeviceId(payload.deviceId);
            updateConnectionState({
              status: ConnectionStatus.Connected,
              deviceId: payload.deviceId,
            });
          }
          refs.isConnectingRef.current = false;
          break;

        case DeviceEvent.Disconnected:
          updateConnectionState({ status: ConnectionStatus.Disconnected });
          refs.isConnectingRef.current = false;
          break;

        case DeviceEvent.AppOpened:
          updateConnectionState({
            status: ConnectionStatus.Connected,
            deviceId: refs.adapterRef.current?.getConnectedDeviceId() ?? '',
          });
          break;

        case DeviceEvent.AppNotOpen:
          // Get required app from adapter (e.g., 'Ethereum' for Ledger)
          // payload.appName contains what's currently open (e.g., 'BOLOS', 'Bitcoin')
          updateConnectionState({
            status: ConnectionStatus.AwaitingApp,
            deviceId: refs.adapterRef.current?.getConnectedDeviceId() ?? '',
            appName:
              refs.adapterRef.current?.getRequiredAppName?.() ?? 'Ethereum',
          });
          break;

        case DeviceEvent.DeviceLocked:
          if (payload.error) {
            handleError(payload.error);
          } else {
            // Create a device locked error using the proper ErrorCode
            const lockedError = createHardwareWalletError(
              ErrorCode.AuthenticationDeviceLocked,
              walletType ?? HardwareWalletType.Ledger,
            );
            updateConnectionState({
              status: ConnectionStatus.ErrorState,
              error: lockedError,
            });
          }
          break;

        case DeviceEvent.ConfirmationRequired:
          updateConnectionState({
            status: ConnectionStatus.AwaitingConfirmation,
            deviceId: refs.adapterRef.current?.getConnectedDeviceId() ?? '',
          });
          break;

        case DeviceEvent.ConfirmationReceived:
          // Return to connected state after confirmation
          updateConnectionState({
            status: ConnectionStatus.Connected,
            deviceId: refs.adapterRef.current?.getConnectedDeviceId() ?? '',
          });
          break;

        case DeviceEvent.ConfirmationRejected:
          if (payload.error) {
            handleError(payload.error);
          }
          break;

        case DeviceEvent.ConnectionFailed:
          if (payload.error) {
            handleError(payload.error);
          }
          refs.isConnectingRef.current = false;
          break;

        case DeviceEvent.OperationTimeout:
          if (payload.error) {
            handleError(payload.error);
          }
          break;

        case DeviceEvent.PermissionChanged:
          // Permission changes are handled separately through permission checks
          break;

        default:
          // Log unknown events in development
          if (__DEV__) {
            console.warn(
              '[HardwareWallet] Unknown device event:',
              payload.event,
            );
          }
      }
    },
    [setters, refs, updateConnectionState, handleError, walletType],
  );

  return {
    updateConnectionState,
    handleDeviceEvent,
    handleError,
    clearError,
  };
};

export default useDeviceEventHandlers;
