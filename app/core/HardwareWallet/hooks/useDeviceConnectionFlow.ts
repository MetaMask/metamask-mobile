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
  deviceId: string | null;
  handleError: (error: unknown) => void;
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
  ensureDeviceReady: (targetDeviceId?: string | null) => Promise<boolean>;
  connect: (targetDeviceId: string) => Promise<void>;
  retryEnsureDeviceReady: () => Promise<void>;
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
  deviceId,
  handleError,
  updateConnectionState,
  createAdapterWithCallbacks,
  initializeAdapter,
  checkTransportEnabledOrShowError,
}: UseDeviceConnectionFlowOptions): UseDeviceConnectionFlowResult => {
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
      updateConnectionState({ status: ConnectionStatus.Connecting });

      try {
        const adapter = refs.adapterRef.current;
        if (!adapter) {
          throw new Error('No adapter available');
        }

        await adapter.connect(targetDeviceId);

        if (!pendingReadyResolveRef.current) {
          DevLogger.log(
            '[HardwareWallet] Connect completed but flow was cancelled — ignoring',
          );
          return;
        }

        setters.setDeviceId(targetDeviceId);

        DevLogger.log(
          '[HardwareWallet] Connect succeeded, continuing readiness check...',
        );

        try {
          await tryEnsureReady(adapter, targetDeviceId);
        } catch (error) {
          DevLogger.log('[HardwareWallet] Readiness check failed:', error);
          handleError(error);
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
    async (targetDeviceId?: string | null): Promise<boolean> => {
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

      const targetType =
        refs.targetWalletTypeRef.current ??
        walletType ??
        HardwareWalletType.Ledger;

      if (!targetDeviceId) {
        setters.setDeviceId(null);
      }

      const adapter = resolveOrCreateAdapter(targetType);

      if (adapter.resetFlowState) {
        adapter.resetFlowState();
      }

      const transportUnavailable =
        await checkTransportEnabledOrShowError(adapter);
      if (transportUnavailable) {
        return createBlockingPromise();
      }

      return createBlockingPromise(() => {
        if (!targetDeviceId) {
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
            await tryEnsureReady(adapter, targetDeviceId);
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
      setters,
      handleError,
      walletType,
      updateConnectionState,
      resolveOrCreateAdapter,
      tryEnsureReady,
      checkTransportEnabledOrShowError,
      createBlockingPromise,
    ],
  );

  const retryEnsureDeviceReady = useCallback(async (): Promise<void> => {
    const adapter = refs.adapterRef.current;
    if (adapter?.resetFlowState) {
      adapter.resetFlowState();
    }

    if (adapter && !(await adapter.ensurePermissions())) {
      return;
    }

    if (adapter && (await checkTransportEnabledOrShowError(adapter))) {
      return;
    }

    if (deviceId && adapter) {
      updateConnectionState({ status: ConnectionStatus.Connecting });
      try {
        await tryEnsureReady(adapter, deviceId);
      } catch (error) {
        handleError(error);
      }
    } else {
      updateConnectionState({ status: ConnectionStatus.Scanning });
    }
  }, [
    deviceId,
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
    retryEnsureDeviceReady,
    closeFlow,
    handleConnectionSuccess,
  };
};
