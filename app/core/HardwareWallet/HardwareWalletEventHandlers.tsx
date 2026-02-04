/* eslint-disable no-console */
import { useCallback } from 'react';
import { HardwareWalletError, ErrorCode } from '@metamask/hw-wallet-sdk';
import {
  ConnectionState,
  HardwareWalletConnectionState,
} from './connectionState';
import { DeviceEvent, DeviceEventPayload } from './types';
import {
  HardwareWalletStateSetters,
  HardwareWalletRefs,
} from './HardwareWalletStateManager';
import { parseErrorByType, createHardwareWalletError } from './errors';
import { HardwareWalletType } from './helpers';

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
    (error: unknown, skipStateUpdate = false) => {
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

      // Skip state update if requested (e.g., when flow is already complete)
      if (!skipStateUpdate) {
        updateConnectionState(ConnectionState.error(hwError));
      } else {
        console.log(
          '[HardwareWallet] Error occurred but skipping state update (flow complete):',
          hwError.message,
        );
      }

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
        return ConnectionState.disconnected();
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
            updateConnectionState(ConnectionState.connected(payload.deviceId));
          }
          refs.isConnectingRef.current = false;
          break;

        case DeviceEvent.Disconnected:
          updateConnectionState(ConnectionState.disconnected());
          refs.isConnectingRef.current = false;
          break;

        case DeviceEvent.AppOpened:
          updateConnectionState(
            ConnectionState.connected(
              refs.adapterRef.current?.getConnectedDeviceId() ?? '',
            ),
          );
          break;

        case DeviceEvent.AppClosed:
          // Get required app from adapter (e.g., 'Ethereum' for Ledger)
          // payload.appName contains what's currently open (e.g., 'BOLOS', 'Bitcoin')
          updateConnectionState(
            ConnectionState.awaitingApp(
              refs.adapterRef.current?.getConnectedDeviceId() ?? '',
              refs.adapterRef.current?.getRequiredAppName?.() ?? 'Ethereum',
            ),
          );
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
            updateConnectionState(ConnectionState.error(lockedError));
          }
          break;

        case DeviceEvent.ConfirmationRequired:
          updateConnectionState(
            ConnectionState.awaitingConfirmation(
              refs.adapterRef.current?.getConnectedDeviceId() ?? '',
            ),
          );
          break;

        case DeviceEvent.ConfirmationReceived:
          // Return to connected state after confirmation
          updateConnectionState(
            ConnectionState.connected(
              refs.adapterRef.current?.getConnectedDeviceId() ?? '',
            ),
          );
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
