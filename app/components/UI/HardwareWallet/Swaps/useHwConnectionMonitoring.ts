import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { ConnectionStatus, ErrorCode } from '@metamask/hw-wallet-sdk';
import { useHardwareWallet } from '../../../../core/HardwareWallet';
import { isUserCancellation } from '../../../../core/HardwareWallet/errors/helpers';
import { parseErrorByType } from '../../../../core/HardwareWallet/errors/parser';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import Logger from '../../../../util/Logger';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
} from './HardwareWalletsSwaps.state';

interface UseHwConnectionMonitoringOptions {
  /** When false, connection changes are not observed or dispatched. */
  isEnabled: boolean;
  /** Current hardware-wallet swaps state-machine status from Redux. */
  currentStatus: HardwareWalletsSwapsStatus;
  /**
   * True once a sign operation is in flight. Disconnect events are ignored
   * until signing starts so pre-signing readiness handoffs do not fail the flow.
   */
  hasActiveSigning: boolean;
}

/**
 * Returns whether `current` should be treated as unchanged relative to the
 * baseline captured when entering {@link HardwareWalletsSwapsStatus.Waiting}.
 * Used to ignore stale disconnect/error state left over from a prior attempt.
 *
 * @param baseline - Connection snapshot taken when Waiting began.
 * @param current - Latest connection snapshot from hardware wallet context.
 * @returns True when `current` matches `baseline` (same status and, for
 */
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

/**
 * Monitors hardware wallet connection state during the swaps signing flow.
 *
 * While status is {@link HardwareWalletsSwapsStatus.Waiting}, watches for
 * disconnects and signing-related errors and dispatches matching
 * actions. Ignores pre-existing bad
 * connection state on first entry to Waiting and recoverable transport errors.
 */
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
  // Debounce buffer: Ledger transports briefly report Disconnected during
  // multi-tx signing (e.g. a BLE blip right after a retry reconnect). We wait
  // out the blip instead of interrupting the batch with a spurious disconnect.
  const disconnectDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const latestConnectionStatusRef = useRef(connectionState.status);

  useEffect(() => {
    const isWaiting = currentStatus === HardwareWalletsSwapsStatus.Waiting;
    latestConnectionStatusRef.current = connectionState.status;

    if (isWaiting && !prevWaitingRef.current) {
      baselineStateRef.current = connectionState;
      handledErrorRef.current = null;
    }
    prevWaitingRef.current = isWaiting;

    if (!isEnabled || !isWaiting) {
      if (disconnectDebounceRef.current) {
        clearTimeout(disconnectDebounceRef.current);
        disconnectDebounceRef.current = null;
      }
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
      if (handledErrorRef.current === ConnectionStatus.Disconnected) return;
      // Debounce: only surface the disconnect if it persists. A transient
      // Ledger blip during multi-tx signing (common on a retry reconnect)
      // would otherwise interrupt the batch before the FeeTransfer signs.
      if (!disconnectDebounceRef.current) {
        disconnectDebounceRef.current = setTimeout(() => {
          disconnectDebounceRef.current = null;
          if (
            latestConnectionStatusRef.current !==
            ConnectionStatus.Disconnected
          ) {
            return;
          }
          if (
            handledErrorRef.current === ConnectionStatus.Disconnected
          ) {
            return;
          }
          handledErrorRef.current = ConnectionStatus.Disconnected;
          Logger.log(
            '[HW-SendBundle] monitoring → dispatching DeviceDisconnected (debounced)',
            {
              connectionStatus: latestConnectionStatusRef.current,
              hasActiveSigning,
              handledErrorBefore: handledErrorRef.current,
            },
          );
          dispatch(
            updateHardwareWalletsSwaps({
              type: HardwareWalletsSwapsEventType.DeviceDisconnected,
            }),
          );
        }, 1000);
      }
      return;
    }

    // Recovered (or other non-Disconnected state): cancel any pending
    // debounced disconnect so a transient blip is not surfaced.
    if (disconnectDebounceRef.current) {
      clearTimeout(disconnectDebounceRef.current);
      disconnectDebounceRef.current = null;
    }

    if (connectionState.status !== ConnectionStatus.ErrorState) {
      handledErrorRef.current = null;
      return;
    }

    const { error } = connectionState;
    if (handledErrorRef.current === error) return;

    const parsedError = parseErrorByType(error);

    if (
      parsedError.code === ErrorCode.ConnectionClosed ||
      parsedError.code === ErrorCode.DeviceDisconnected
    ) {
      if (!hasActiveSigning) {
        return;
      }
      handledErrorRef.current = error;
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.DeviceDisconnected,
        }),
      );
      return;
    }

    if (error && isUserCancellation(error)) {
      handledErrorRef.current = error;
      dispatch(
        updateHardwareWalletsSwaps({
          type: HardwareWalletsSwapsEventType.Rejected,
        }),
      );
      return;
    }

    handledErrorRef.current = error;
  }, [connectionState, currentStatus, hasActiveSigning, isEnabled, dispatch]);

  // Clear any pending debounced disconnect fire on unmount.
  useEffect(
    () => () => {
      if (disconnectDebounceRef.current) {
        clearTimeout(disconnectDebounceRef.current);
        disconnectDebounceRef.current = null;
      }
    },
    [],
  );

  /** Clears deduplication and baseline refs so a retry can observe the same error again. */
  const resetHandledError = useCallback(() => {
    handledErrorRef.current = null;
    baselineStateRef.current = null;
    if (disconnectDebounceRef.current) {
      clearTimeout(disconnectDebounceRef.current);
      disconnectDebounceRef.current = null;
    }
  }, []);

  return { resetHandledError };
}
