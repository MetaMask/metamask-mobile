import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { HardwareWalletsSwapsStatus } from '../HardwareWalletsSwaps.state';

/**
 * Options for the hardware wallet confirmation transaction monitoring hook.
 */
interface UseHwConfirmationMonitoringOptions {
  isEnabled: boolean;
  currentStatus: HardwareWalletsSwapsStatus;
  confirmationTxId: string | undefined;
  isDeviceDisconnected: boolean;
}

export function useHwConfirmationMonitoring({
  isEnabled,
  currentStatus,
  confirmationTxId,
  isDeviceDisconnected,
}: UseHwConfirmationMonitoringOptions) {
  const dispatch = useDispatch();
  const previousTxIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isEnabled) return;
    if (currentStatus !== HardwareWalletsSwapsStatus.Waiting) return;

    if (previousTxIdRef.current !== confirmationTxId) {
      console.log('[HW-ConfirmationMonitor] confirmationTxId changed', {
        previous: previousTxIdRef.current,
        current: confirmationTxId,
        isDeviceDisconnected,
      });
    }
    previousTxIdRef.current = confirmationTxId;
  }, [
    isEnabled,
    currentStatus,
    confirmationTxId,
    dispatch,
    isDeviceDisconnected,
  ]);

  return { confirmationTxId };
}
