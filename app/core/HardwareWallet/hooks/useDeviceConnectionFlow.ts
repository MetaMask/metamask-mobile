import { useCallback, useRef } from 'react';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

import { HardwareWalletAdapter } from '../types';
import {
  HardwareWalletRefs,
  HardwareWalletStateSetters,
} from './useHardwareWalletStateManager';
import DevLogger from '../../SDKConnect/utils/DevLogger';

interface UseDeviceConnectionFlowOptions {
  refs: HardwareWalletRefs;
  setters: HardwareWalletStateSetters;
  walletType: HardwareWalletType | null;
  handleError: (error: unknown) => void;
  clearError: () => void;
  updateConnectionState: (state: HardwareWalletConnectionState) => void;
  createAdapterWithCallbacks: (
    targetType: HardwareWalletType,
  ) => HardwareWalletAdapter;
  initializeAdapter: (adapter: HardwareWalletAdapter) => void;
  checkTransportEnabledOrShowError: (
    adapter: HardwareWalletAdapter,
  ) => Promise<boolean>;
}

interface UseDeviceConnectionFlowResult {
  ensureDeviceReady: (targetDeviceId?: string) => Promise<boolean>;
  connect: (targetDeviceId: string) => Promise<void>;
  retryLastOperation: () => Promise<void>;
  closeFlow: () => void;
  handleConnectionSuccess: () => void;
}

/**
 * Manages the device connection flow: the consumer calls `ensureDeviceReady`
 * which returns a Promise that only resolves when the device is confirmed
 * ready (or the user cancels). Internally coordinates adapter resolution,
 * transport checks, device connection, and retry logic.
 */
export const useDeviceConnectionFlow = ({
  refs,
  setters,
  walletType,
  handleError,
  clearError,
  updateConnectionState,
  createAdapterWithCallbacks,
  initializeAdapter,
  checkTransportEnabledOrShowError,
}: UseDeviceConnectionFlowOptions): UseDeviceConnectionFlowResult => {
  const lastOperationRef = useRef<{
    type: 'connect' | 'ensureReady';
    deviceId?: string;
  } | null>(null);

  const pendingReadyResolveRef = useRef<((ready: boolean) => void) | null>(
    null,
  );

  const connectionSuccessCallbackRef = useRef<(() => void) | null>(null);

  /**
   * Resolve an existing adapter or create a new one if the wallet type
   * doesn't match. Named replacement for the inline IIFE that was previously
   * in `ensureDeviceReady`.
   */
  const resolveOrCreateAdapter = useCallback(
    (targetType: HardwareWalletType): HardwareWalletAdapter => {
      const existing = refs.adapterRef.current;
      if (existing && existing.walletType === targetType) {
        return existing;
      }

      DevLogger.log(
        '[HardwareWallet] Creating adapter for:',
        targetType,
        '(existing was:',
        existing?.walletType,
        ')',
      );
      // eslint-disable-next-line no-empty-function
      existing?.disconnect().catch(() => {});
      const adapter = createAdapterWithCallbacks(targetType);
      initializeAdapter(adapter);
      return adapter;
    },
    [refs, createAdapterWithCallbacks, initializeAdapter],
  );

  /**
   * Wire up the blocking promise refs. Both the "transport unavailable"
   * and "normal" code paths share this setup.
   */
  const createBlockingPromise = useCallback(
    (afterSetup?: () => void): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        pendingReadyResolveRef.current = resolve;

        connectionSuccessCallbackRef.current = () => {
          DevLogger.log(
            '[HardwareWallet] Success callback - resolving with true',
          );
          if (pendingReadyResolveRef.current === resolve) {
            pendingReadyResolveRef.current = null;
            resolve(true);
          }
        };

        afterSetup?.();
      }),
    [],
  );

  const tryEnsureReady = useCallback(
    async (
      adapter: {
        ensureDeviceReady: (id: string) => Promise<boolean>;
        markFlowComplete: () => void;
      },
      targetDeviceId: string,
    ): Promise<boolean> => {
      const isReady = await adapter.ensureDeviceReady(targetDeviceId);
      if (isReady) {
        adapter.markFlowComplete();
        updateConnectionState({
          status: ConnectionStatus.Ready,
          deviceId: targetDeviceId,
        });
      } else {
        DevLogger.log(
          '[HardwareWallet] Device not ready — adapter event already handled state transition',
        );
      }
      return isReady;
    },
    [updateConnectionState],
  );

  const connect = useCallback(
    async (targetDeviceId: string): Promise<void> => {
      if (refs.isConnectingRef.current) {
        return;
      }

      refs.isConnectingRef.current = true;
      lastOperationRef.current = {
        type: 'connect',
        deviceId: targetDeviceId,
      };

      updateConnectionState({ status: ConnectionStatus.Connecting });

      try {
        const adapter = refs.adapterRef.current;
        if (!adapter) {
          throw new Error('No adapter available');
        }

        await adapter.connect(targetDeviceId);

        if (!lastOperationRef.current) {
          DevLogger.log(
            '[HardwareWallet] Connect completed but flow was cancelled — ignoring',
          );
          return;
        }

        setters.setDeviceId(targetDeviceId);

        if (pendingReadyResolveRef.current) {
          DevLogger.log(
            '[HardwareWallet] Connect succeeded, continuing readiness check...',
          );

          try {
            await tryEnsureReady(adapter, targetDeviceId);
          } catch (error) {
            DevLogger.log('[HardwareWallet] Readiness check failed:', error);
            handleError(error);
          }
        } else {
          updateConnectionState({
            status: ConnectionStatus.AwaitingApp,
            deviceId: targetDeviceId,
          });
        }
      } catch (error) {
        handleError(error);
      } finally {
        refs.isConnectingRef.current = false;
      }
    },
    [refs, setters, handleError, updateConnectionState, tryEnsureReady],
  );

  const ensureDeviceReady = useCallback(
    async (targetDeviceId?: string): Promise<boolean> => {
      DevLogger.log(
        '[HardwareWallet] ensureDeviceReady called with deviceId:',
        targetDeviceId,
      );

      if (pendingReadyResolveRef.current) {
        DevLogger.log(
          '[HardwareWallet] Abandoning previous pending readiness check (not resolving)',
        );
        pendingReadyResolveRef.current = null;
      }

      const targetType = walletType ?? HardwareWalletType.Ledger;
      const deviceIdToUse =
        targetDeviceId === undefined ? undefined : targetDeviceId;

      const adapter = resolveOrCreateAdapter(targetType);

      if (adapter.resetFlowState) {
        adapter.resetFlowState();
      }

      lastOperationRef.current = {
        type: 'ensureReady',
        deviceId: deviceIdToUse,
      };

      const transportUnavailable =
        await checkTransportEnabledOrShowError(adapter);
      if (transportUnavailable) {
        return createBlockingPromise();
      }

      return createBlockingPromise(() => {
        if (!deviceIdToUse) {
          DevLogger.log(
            '[HardwareWallet] No device ID - starting device selection',
          );
          updateConnectionState({ status: ConnectionStatus.Scanning });
          return;
        }

        DevLogger.log('[HardwareWallet] Have device ID, checking readiness...');

        updateConnectionState({ status: ConnectionStatus.Connecting });

        (async () => {
          try {
            refs.abortControllerRef.current = new AbortController();
            await tryEnsureReady(adapter, deviceIdToUse);
          } catch (error) {
            DevLogger.log('[HardwareWallet] ensureDeviceReady error:', error);
            handleError(error);
          } finally {
            refs.abortControllerRef.current = null;
          }
        })();
      });
    },
    [
      refs,
      handleError,
      walletType,
      updateConnectionState,
      resolveOrCreateAdapter,
      tryEnsureReady,
      checkTransportEnabledOrShowError,
      createBlockingPromise,
    ],
  );

  const retryLastOperation = useCallback(async (): Promise<void> => {
    const adapter = refs.adapterRef.current;
    if (adapter?.resetFlowState) {
      adapter.resetFlowState();
    }

    const lastOp = lastOperationRef.current;
    if (!lastOp) {
      clearError();
      return;
    }

    if (adapter && (await checkTransportEnabledOrShowError(adapter))) {
      return;
    }

    switch (lastOp.type) {
      case 'ensureReady':
        if (lastOp.deviceId && adapter) {
          updateConnectionState({ status: ConnectionStatus.Connecting });
          try {
            await tryEnsureReady(adapter, lastOp.deviceId);
          } catch (error) {
            handleError(error);
          }
        } else {
          DevLogger.log(
            '[HardwareWallet] Retry: No deviceId - restarting device selection',
          );
          updateConnectionState({ status: ConnectionStatus.Scanning });
        }
        break;
      case 'connect':
        if (lastOp.deviceId) {
          await connect(lastOp.deviceId);
        }
        break;
      default:
        break;
    }
  }, [
    connect,
    clearError,
    handleError,
    updateConnectionState,
    refs,
    checkTransportEnabledOrShowError,
    tryEnsureReady,
  ]);

  const closeFlow = useCallback(() => {
    if (pendingReadyResolveRef.current) {
      pendingReadyResolveRef.current(false);
      pendingReadyResolveRef.current = null;
    }
    lastOperationRef.current = null;
    setters.setTargetWalletType(null);
    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [setters, updateConnectionState]);

  const handleConnectionSuccess = useCallback(() => {
    const callback = connectionSuccessCallbackRef.current;
    if (callback) {
      connectionSuccessCallbackRef.current = null;
      callback();
    }
    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [updateConnectionState]);

  return {
    ensureDeviceReady,
    connect,
    retryLastOperation,
    closeFlow,
    handleConnectionSuccess,
  };
};
