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
  hasActiveSigning: boolean;
}

export function useHwConnectionMonitoring({
  isEnabled,
  currentStatus,
  hasActiveSigning,
}: UseHwConnectionMonitoringOptions) {
  const dispatch = useDispatch();
  const { connectionState } = useHardwareWallet();
  const handledErrorRef = useRef<unknown>(null);
  const isDisconnectedRef = useRef(false);
  const baselineStateRef = useRef<typeof connectionState | null>(null);
  const prevWaitingRef = useRef(false);

  useEffect(() => {
    const isWaiting = currentStatus === HardwareWalletsSwapsStatus.Waiting;

    if (isWaiting && !prevWaitingRef.current) {
      baselineStateRef.current = connectionState;
      handledErrorRef.current = null;
      isDisconnectedRef.current = false;
    }
    prevWaitingRef.current = isWaiting;

    if (!isEnabled) return;
    if (!isWaiting) {
      return;
    }

    if (connectionState === baselineStateRef.current) {
      return;
    }

    if (connectionState.status === ConnectionStatus.Disconnected) {
      console.log('[HW-ConnectionMonitor] Disconnected detected', { hasActiveSigning, isDisconnected: isDisconnectedRef.current });
      if (!hasActiveSigning) {
        return;
      }
      if (handledErrorRef.current === 'disconnected') return;
      console.log('[HW-ConnectionMonitor] Dispatching DEVICE_DISCONNECTED');
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
    console.log('[HW-ConnectionMonitor] Error state detected', { error: String(error), hasActiveSigning });
    if (handledErrorRef.current === error) return;
    handledErrorRef.current = error;

    const parsedError = parseErrorByType(error);

    if (
      parsedError.code === ErrorCode.ConnectionClosed ||
      parsedError.code === ErrorCode.DeviceDisconnected
    ) {
      console.log('[HW-ConnectionMonitor] Parsed as connection/disconnect error — dispatching DEVICE_DISCONNECTED');
      if (!hasActiveSigning) {
        return;
      }
      isDisconnectedRef.current = true;
      dispatch(updateHardwareWalletsSwaps({ type: 'DEVICE_DISCONNECTED' }));
      return;
    }

    if (error && isUserCancellation(error)) {
      console.log('[HW-ConnectionMonitor] User cancellation detected — dispatching REJECTED');
      dispatch(
        updateHardwareWalletsSwaps({
          type: 'REJECTED',
        }),
      );
      return;
    }
  }, [connectionState, currentStatus, hasActiveSigning, isEnabled, dispatch]);

  const resetHandledError = useCallback(() => {
    handledErrorRef.current = null;
    isDisconnectedRef.current = false;
    baselineStateRef.current = null;
  }, []);

  return { isDisconnectedRef, resetHandledError };
}
