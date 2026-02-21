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
import DevLogger from '../SDKConnect/utils/DevLogger';

export interface UseDeviceEventHandlersOptions {
  refs: HardwareWalletRefs;
  setters: HardwareWalletStateSetters;
  walletType: HardwareWalletType | null;
}

export interface DeviceEventHandlersResult {
  updateConnectionState: (newState: HardwareWalletConnectionState) => void;
  handleDeviceEvent: (payload: DeviceEventPayload) => void;
  handleError: (error: unknown) => void;
  clearError: () => void;
}

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
          walletType ?? HardwareWalletType.Ledger,
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

  const clearError = useCallback(() => {
    setters.setConnectionState((prev) => {
      if (prev.status === ConnectionStatus.ErrorState) {
        return { status: ConnectionStatus.Disconnected };
      }
      return prev;
    });
  }, [setters]);

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
            const lockedError = createHardwareWalletError(
              ErrorCode.AuthenticationDeviceLocked,
              walletType ?? HardwareWalletType.Ledger,
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
    clearError,
  };
};

export default useDeviceEventHandlers;
