import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { ConnectionStatus, ErrorCode } from '@metamask/hw-wallet-sdk';
import { useHardwareWallet } from '../../../../../../core/HardwareWallet';
import { isUserCancellation } from '../../../../../../core/HardwareWallet/errors/helpers';
import { parseErrorByType } from '../../../../../../core/HardwareWallet/errors/parser';
import { updateHardwareWalletsSwaps } from '../../../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStatus } from '../HardwareWalletsSwaps.state';

interface UseHwConnectionMonitoringOptions {
  isEnabled: boolean;
  currentStatus: HardwareWalletsSwapsStatus;
}

export function useHwConnectionMonitoring({
  isEnabled,
  currentStatus,
}: UseHwConnectionMonitoringOptions) {
  const dispatch = useDispatch();
  const { connectionState } = useHardwareWallet();
  const handledErrorRef = useRef<unknown>(null);
  const isDisconnectedRef = useRef(false);

  useEffect(() => {
    if (!isEnabled) return;
    if (currentStatus !== HardwareWalletsSwapsStatus.Waiting) {
      return;
    }

    if (connectionState.status === ConnectionStatus.Disconnected) {
      if (handledErrorRef.current === 'disconnected') return;
      handledErrorRef.current = 'disconnected';
      isDisconnectedRef.current = true;
      dispatch(updateHardwareWalletsSwaps({ type: 'DEVICE_DISCONNECTED' }));
      return;
    }

    if (connectionState.status !== ConnectionStatus.ErrorState) {
      handledErrorRef.current = null;
      return;
    }

    const { error } = connectionState;
    if (handledErrorRef.current === error) return;
    handledErrorRef.current = error;

    const parsedError = parseErrorByType(error);

    if (
      parsedError.code === ErrorCode.ConnectionClosed ||
      parsedError.code === ErrorCode.DeviceDisconnected
    ) {
      isDisconnectedRef.current = true;
      dispatch(updateHardwareWalletsSwaps({ type: 'DEVICE_DISCONNECTED' }));
      return;
    }

    dispatch(
      updateHardwareWalletsSwaps({
        type:
          error && isUserCancellation(error)
            ? 'REJECTED'
            : 'TRANSACTION_FAILED',
      }),
    );
  }, [connectionState, currentStatus, isEnabled, dispatch]);

  const resetHandledError = useCallback(() => {
    handledErrorRef.current = null;
    isDisconnectedRef.current = false;
  }, []);

  return { isDisconnectedRef, resetHandledError };
}
