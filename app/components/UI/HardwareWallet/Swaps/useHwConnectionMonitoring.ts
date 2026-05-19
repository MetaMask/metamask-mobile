import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { ConnectionStatus, ErrorCode } from '@metamask/hw-wallet-sdk';
import { useHardwareWallet } from '../../../../core/HardwareWallet';
import { isUserCancellation } from '../../../../core/HardwareWallet/errors/helpers';
import { parseErrorByType } from '../../../../core/HardwareWallet/errors/parser';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
} from './HardwareWalletsSwaps.state';

interface UseHwConnectionMonitoringOptions {
  isEnabled: boolean;
  currentStatus: HardwareWalletsSwapsStatus;
  hasActiveSigning: boolean;
}

export function shouldIgnoreAsBaseline(
  baseline: { status: ConnectionStatus; error?: unknown },
  current: { status: ConnectionStatus; error?: unknown },
): boolean {
  if (baseline.status !== current.status) {
    return false;
  }

  if (
    baseline.status === ConnectionStatus.ErrorState &&
    current.status === ConnectionStatus.ErrorState
  ) {
    return baseline.error === current.error;
  }

  return true;
}

export function useHwConnectionMonitoring({
  isEnabled,
  currentStatus,
  hasActiveSigning,
}: UseHwConnectionMonitoringOptions) {
  const dispatch = useDispatch();
  const { connectionState } = useHardwareWallet();
  const handledErrorRef = useRef<unknown>(null);
  const baselineStateRef = useRef<typeof connectionState | null>(null);
  const prevWaitingRef = useRef(false);

  useEffect(() => {
    const isWaiting = currentStatus === HardwareWalletsSwapsStatus.Waiting;

    if (isWaiting && !prevWaitingRef.current) {
      baselineStateRef.current = connectionState;
      handledErrorRef.current = null;
    }
    prevWaitingRef.current = isWaiting;

    if (!isEnabled) return;
    if (!isWaiting) {
      return;
    }

    if (
      baselineStateRef.current &&
      connectionState.status !== baselineStateRef.current.status
    ) {
      baselineStateRef.current = null;
    }

    if (
      baselineStateRef.current &&
      shouldIgnoreAsBaseline(baselineStateRef.current, connectionState)
    ) {
      return;
    }

    if (connectionState.status === ConnectionStatus.Disconnected) {
      if (!hasActiveSigning) {
        return;
      }
      if (handledErrorRef.current === 'disconnected') return;
      handledErrorRef.current = 'disconnected';
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.DeviceDisconnected,
        }),
      );
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
      if (!hasActiveSigning) {
        return;
      }
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.DeviceDisconnected,
        }),
      );
      return;
    }

    if (error && isUserCancellation(error)) {
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Rejected,
        }),
      );
      return;
    }
  }, [connectionState, currentStatus, hasActiveSigning, isEnabled, dispatch]);

  const resetHandledError = useCallback(() => {
    handledErrorRef.current = null;
    baselineStateRef.current = null;
  }, []);

  return { resetHandledError };
}
