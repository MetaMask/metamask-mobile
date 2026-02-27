import { useCallback, useEffect } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  HardwareWalletError,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

import { createHardwareWalletError } from '../errors';
import { HardwareWalletAdapter } from '../types';
import DevLogger from '../../SDKConnect/utils/DevLogger';

interface UseTransportMonitoringOptions {
  isTransportAvailable: boolean;
  previousTransportAvailableRef: React.MutableRefObject<boolean | null>;
  connectionState: HardwareWalletConnectionState;
  adapterRef: React.MutableRefObject<HardwareWalletAdapter | null>;
  walletType: HardwareWalletType | null;
  updateConnectionState: (state: HardwareWalletConnectionState) => void;
}

interface UseTransportMonitoringResult {
  /**
   * Checks transport availability via the adapter and shows an error if
   * unavailable. Returns `true` when transport is unavailable (caller should
   * abort), `false` when transport is ready.
   */
  checkTransportEnabledOrShowError: (
    adapter: HardwareWalletAdapter,
  ) => Promise<boolean>;
}

/**
 * Monitors transport availability (e.g. Bluetooth on/off) and reacts to
 * changes. Provides helpers for imperative transport checks used by the
 * connection and retry flows.
 */
export const useTransportMonitoring = ({
  isTransportAvailable,
  previousTransportAvailableRef,
  connectionState,
  adapterRef,
  walletType,
  updateConnectionState,
}: UseTransportMonitoringOptions): UseTransportMonitoringResult => {
  const createTransportDisabledError =
    useCallback((): HardwareWalletError | null => {
      const adapter = adapterRef.current;
      const errorCode = adapter?.getTransportDisabledErrorCode() ?? null;
      if (errorCode === null) {
        return null;
      }
      const targetType =
        walletType ?? adapter?.walletType ?? HardwareWalletType.Ledger;
      return createHardwareWalletError(errorCode, targetType);
      // Stable ref (adapterRef) — not needed as a dep
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletType]);

  const checkTransportEnabledOrShowError = useCallback(
    async (adapter: HardwareWalletAdapter): Promise<boolean> => {
      const isReady = await adapter.isTransportAvailable();
      const error = createTransportDisabledError();
      if (!isReady && error) {
        updateConnectionState({
          status: ConnectionStatus.ErrorState,
          error,
        });
        return true;
      }
      return false;
    },
    [createTransportDisabledError, updateConnectionState],
  );

  useEffect(() => {
    const wasAvailable = previousTransportAvailableRef.current;
    previousTransportAvailableRef.current = isTransportAvailable;

    if (!wasAvailable || isTransportAvailable) {
      return;
    }

    DevLogger.log(
      '[HardwareWallet] Transport went from available to unavailable',
    );

    const activeStates = [
      ConnectionStatus.Scanning,
      ConnectionStatus.Connecting,
      ConnectionStatus.AwaitingApp,
      ConnectionStatus.AwaitingConfirmation,
      ConnectionStatus.Connected,
    ];

    const isInActiveState = activeStates.includes(connectionState.status);
    const transportError = createTransportDisabledError();

    if (isInActiveState && transportError) {
      DevLogger.log(
        '[HardwareWallet] Transport disabled during active operation - showing error',
      );
      updateConnectionState({
        status: ConnectionStatus.ErrorState,
        error: transportError,
      });
    }
    // Stable ref (previousTransportAvailableRef) — not needed as a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isTransportAvailable,
    connectionState.status,
    updateConnectionState,
    createTransportDisabledError,
  ]);

  return {
    checkTransportEnabledOrShowError,
  };
};
