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
} from './useHardwareWalletStateManager';
import { parseErrorByType, createHardwareWalletError } from '../errors';
import { assertWalletType } from '../helpers';
import DevLogger from '../../SDKConnect/utils/DevLogger';

/** Options for the {@link useDeviceEventHandlers} hook. */
interface UseDeviceEventHandlersOptions {
  /** Mutable refs shared across the hardware wallet system. */
  refs: HardwareWalletRefs;
  /** State setter functions for connection state, device ID, etc. */
  setters: HardwareWalletStateSetters;
  /** Current wallet type, used for error parsing context. */
  walletType: HardwareWalletType | null;
}

/** Return value of the {@link useDeviceEventHandlers} hook. */
interface DeviceEventHandlersResult {
  /** Directly sets the connection state (no dedup — callers control when to update). */
  updateConnectionState: (newState: HardwareWalletConnectionState) => void;
  /** Routes a device event payload to the appropriate state transition. */
  handleDeviceEvent: (payload: DeviceEventPayload) => void;
  /** Parses an error into a HardwareWalletError and transitions to ErrorState. */
  handleError: (error: unknown) => void;
}

/**
 * Hook that provides device event handlers for the hardware wallet state machine.
 *
 * Translates raw device events (Connected, Disconnected, AppOpened, etc.) into
 * connection state transitions and handles error parsing/normalization.
 */
export const useDeviceEventHandlers = ({
  refs,
  setters,
  walletType,
}: UseDeviceEventHandlersOptions): DeviceEventHandlersResult => {
  const updateConnectionState = useCallback(
    (newState: HardwareWalletConnectionState) => {
      setters.setConnectionState(newState);
    },
    [setters],
  );

  const handleError = useCallback(
    (error: unknown) => {
      let hwError: HardwareWalletError;

      if (error instanceof HardwareWalletError) {
        hwError = error;
      } else {
        hwError = parseErrorByType(
          error,
          assertWalletType(walletType ?? refs.adapterRef.current?.walletType),
        );
      }

      updateConnectionState({
        status: ConnectionStatus.ErrorState,
        error: hwError,
      });

      refs.isConnectingRef.current = false;
    },
    [updateConnectionState, walletType, refs],
  );

  const handleDeviceEvent = useCallback(
    (payload: DeviceEventPayload) => {
      switch (payload.event) {
        case DeviceEvent.Connected: {
          const connectedDeviceId =
            payload.deviceId ??
            refs.adapterRef.current?.getConnectedDeviceId() ??
            '';
          if (connectedDeviceId) {
            setters.setDeviceId(connectedDeviceId);
          }
          updateConnectionState({
            status: ConnectionStatus.Connected,
            deviceId: connectedDeviceId,
          });
          refs.isConnectingRef.current = false;
          break;
        }

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
            const lockedError = createHardwareWalletError(
              ErrorCode.AuthenticationDeviceLocked,
              assertWalletType(
                walletType ?? refs.adapterRef.current?.walletType,
              ),
            );
            updateConnectionState({
              status: ConnectionStatus.ErrorState,
              error: lockedError,
            });
          }
          refs.isConnectingRef.current = false;
          break;

        case DeviceEvent.ConfirmationRequired:
          updateConnectionState({
            status: ConnectionStatus.AwaitingConfirmation,
            deviceId: refs.adapterRef.current?.getConnectedDeviceId() ?? '',
          });
          break;

        case DeviceEvent.ConfirmationReceived:
          updateConnectionState({
            status: ConnectionStatus.Connected,
            deviceId: refs.adapterRef.current?.getConnectedDeviceId() ?? '',
          });
          break;

        case DeviceEvent.ConfirmationRejected:
          if (payload.error) {
            handleError(payload.error);
          } else {
            updateConnectionState({
              status: ConnectionStatus.Connected,
              deviceId: refs.adapterRef.current?.getConnectedDeviceId() ?? '',
            });
          }
          break;

        case DeviceEvent.ConnectionFailed:
          if (payload.error) {
            handleError(payload.error);
          } else {
            updateConnectionState({ status: ConnectionStatus.Disconnected });
          }
          refs.isConnectingRef.current = false;
          break;

        case DeviceEvent.OperationTimeout:
          if (payload.error) {
            handleError(payload.error);
          }
          refs.isConnectingRef.current = false;
          break;

        case DeviceEvent.PermissionChanged:
          break;

        default:
          if (__DEV__) {
            DevLogger.log(
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
  };
};
