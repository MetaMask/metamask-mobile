import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { updateHardwareWalletsSwaps } from '../../../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStatus } from '../HardwareWalletsSwaps.state';

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

    previousTxIdRef.current = confirmationTxId;
  }, [
    isEnabled,
    currentStatus,
    confirmationTxId,
    dispatch,
  ]);

  return { confirmationTxId };
}
