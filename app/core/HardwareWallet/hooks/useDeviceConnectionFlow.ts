import { useCallback, useRef } from 'react';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
  ErrorCode,
} from '@metamask/hw-wallet-sdk';

import { HardwareWalletAdapter } from '../types';
import { createHardwareWalletError } from '../errors';
import {
  HardwareWalletRefs,
  HardwareWalletStateSetters,
} from './useHardwareWalletStateManager';

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
  /** Called at the start of each new ensureDeviceReady flow. */
  onFlowStart?: () => void;
  /**
   * Provider-owned flag tracking whether a connection flow is active.
   * Set while a readiness flow is armed/pending; cleared whenever the
   * pending promise is resolved (success, cancel, or closeFlow). Used to
   * gate internal error surfacing: late errors after the flow closed must
   * not re-open the error bottom sheet over the app.
   */
  flowActiveRef: React.MutableRefObject<boolean>;
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
  onFlowStart,
  flowActiveRef,
}: UseDeviceConnectionFlowOptions): UseDeviceConnectionFlowResult => {
  const pendingReadyResolveRef = useRef<((ready: boolean) => void) | null>(
    null,
  );

  const connectionSuccessCallbackRef = useRef<(() => void) | null>(null);

  const lastDeviceIdRef = useRef<string | null>(deviceId);
  lastDeviceIdRef.current = deviceId;

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
   * Waiter for Continue or cancel. `afterSetup` runs the readiness work.
   */
  const createBlockingPromise = useCallback(
    (afterSetup?: () => void): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        pendingReadyResolveRef.current = resolve;
        flowActiveRef.current = true;

        connectionSuccessCallbackRef.current = () => {
          DevLogger.log(
            '[HardwareWallet] Success callback - resolving with true',
          );
          if (pendingReadyResolveRef.current === resolve) {
            pendingReadyResolveRef.current = null;
            flowActiveRef.current = false;
            resolve(true);
          }
        };

        afterSetup?.();
      }),
    [flowActiveRef],
  );

  const tryEnsureReady = useCallback(
    async (
      adapter: {
        walletType?: HardwareWalletType | null;
        ensureDeviceReady: (id: string) => Promise<boolean>;
        markFlowComplete: () => void;
      },
      targetDeviceId: string,
    ): Promise<boolean> => {
      const isReady = await adapter.ensureDeviceReady(targetDeviceId);
      if (!flowActiveRef.current) {
        // closeFlow ran while we awaited — do not surface Ready / AppNotOpen.
        return false;
      }
      if (isReady) {
        adapter.markFlowComplete();
        // Resolve the blocking promise immediately when the adapter reports
        // ready — same as QR. Previously, Ledger relied on the bottom sheet's
        // "Continue" button (handleConnectionSuccess) to resolve the promise,
        // but that callback never fires when the sheet is suppressed by
        // screens that render their own signing UI (HardwareWalletsSwaps).
        updateConnectionState({
          status: ConnectionStatus.Ready,
          deviceId: targetDeviceId,
        });
        const resolvePending = pendingReadyResolveRef.current;
        if (resolvePending) {
          pendingReadyResolveRef.current = null;
          connectionSuccessCallbackRef.current = null;
          flowActiveRef.current = false;
          resolvePending(true);
        }
      } else {
        DevLogger.log(
          '[HardwareWallet] Device not ready — adapter event already handled state transition',
        );
      }
      return isReady;
    },
    [updateConnectionState, flowActiveRef],
  );

  const runReadinessCheck = useCallback(
    async (
      adapter: HardwareWalletAdapter,
      sessionDeviceId: string,
    ): Promise<void> => {
      refs.abortControllerRef.current = new AbortController();
      try {
        await tryEnsureReady(adapter, sessionDeviceId);
      } catch (error) {
        DevLogger.log('[HardwareWallet] ensureDeviceReady error:', error);
        if (flowActiveRef.current) {
          handleError(error);
        }
      } finally {
        refs.abortControllerRef.current = null;
      }
    },
    // refs is not needed as a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tryEnsureReady, flowActiveRef, handleError],
  );

  /**
   * Pick the device id to check, or `null` to leave the waiter pending
   * (scanning, transport unavailable, or the flow was cancelled).
   *
   * Live session (already connected / silent reconnect) skips Connecting so
   * it cannot overwrite AwaitingApp. Guided scan/connect sets Connecting.
   */
  const resolveReadinessTarget = useCallback(
    async (
      adapter: HardwareWalletAdapter,
      targetDeviceId: string | null | undefined,
    ): Promise<string | null> => {
      if (
        targetDeviceId &&
        adapter.isConnected?.() &&
        adapter.getConnectedDeviceId() === targetDeviceId
      ) {
        DevLogger.log(
          '[HardwareWallet] Already connected to device, checking readiness directly',
        );
        return targetDeviceId;
      }

      if (
        targetDeviceId &&
        !adapter.isConnected?.() &&
        adapter.backgroundReconnect
      ) {
        try {
          refs.abortControllerRef.current = new AbortController();
          const reconnected = await adapter.backgroundReconnect(targetDeviceId);
          if (!flowActiveRef.current) {
            return null;
          }
          if (reconnected) {
            return targetDeviceId;
          }
        } catch {
          // Continue to guided scan/connect.
        } finally {
          refs.abortControllerRef.current = null;
        }
      }

      if (!flowActiveRef.current) {
        return null;
      }

      // Avoid pre-gating scan mode on transport state. BLE state can be
      // briefly unknown/stale on startup and wrongly show "Bluetooth required"
      // before discovery starts.
      if (targetDeviceId) {
        const transportUnavailable =
          await checkTransportEnabledOrShowError(adapter);
        if (!flowActiveRef.current || transportUnavailable) {
          return null;
        }

        DevLogger.log('[HardwareWallet] Have device ID, checking readiness...');
        updateConnectionState({ status: ConnectionStatus.Connecting });
        return targetDeviceId;
      }

      if (!adapter.requiresDeviceDiscovery) {
        DevLogger.log(
          '[HardwareWallet] No device ID but discovery not required - checking readiness',
        );
        updateConnectionState({ status: ConnectionStatus.Connecting });
        return 'default';
      }

      DevLogger.log(
        '[HardwareWallet] No device ID - starting device selection',
      );
      updateConnectionState({ status: ConnectionStatus.Scanning });
      return null;
    },
    // refs is not needed as a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkTransportEnabledOrShowError, updateConnectionState],
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
          throw createHardwareWalletError(
            ErrorCode.DeviceNotReady,
            walletType,
            'No adapter available',
          );
        }

        await adapter.connect(targetDeviceId);

        if (!pendingReadyResolveRef.current) {
          DevLogger.log(
            '[HardwareWallet] Connect completed but flow was cancelled — ignoring',
          );
          return;
        }

        setters.setDeviceId(targetDeviceId);
        lastDeviceIdRef.current = targetDeviceId;

        DevLogger.log(
          '[HardwareWallet] Connect succeeded, continuing readiness check...',
        );

        try {
          await tryEnsureReady(adapter, targetDeviceId);
        } catch (error) {
          DevLogger.log('[HardwareWallet] Readiness check failed:', error);
          if (flowActiveRef.current) {
            handleError(error);
          }
        }
      } catch (error) {
        if (flowActiveRef.current) {
          handleError(error);
        }
      } finally {
        refs.isConnectingRef.current = false;
      }
    },
    [
      refs,
      setters,
      handleError,
      walletType,
      updateConnectionState,
      tryEnsureReady,
      flowActiveRef,
    ],
  );

  const ensureDeviceReady = useCallback(
    async (targetDeviceId?: string | null): Promise<boolean> => {
      DevLogger.log(
        '[HardwareWallet] ensureDeviceReady called with deviceId:',
        targetDeviceId,
      );

      onFlowStart?.();
      flowActiveRef.current = true;

      if (pendingReadyResolveRef.current) {
        DevLogger.log(
          '[HardwareWallet] Cancelling previous pending readiness check',
        );
        const resolvePending = pendingReadyResolveRef.current;
        if (resolvePending) {
          pendingReadyResolveRef.current = null;
          connectionSuccessCallbackRef.current = null;
          resolvePending(false);
        }
      }

      const targetType =
        refs.targetWalletTypeRef.current ??
        refs.pendingOperationWalletTypeRef.current ??
        walletType;

      if (!targetType) {
        throw createHardwareWalletError(
          ErrorCode.Unknown,
          walletType,
          'ensureDeviceReady called without a wallet type',
        );
      }

      if (!targetDeviceId) {
        setters.setDeviceId(null);
        lastDeviceIdRef.current = null;
      } else {
        lastDeviceIdRef.current = targetDeviceId;
      }

      const adapter = resolveOrCreateAdapter(targetType);

      if (adapter.resetFlowState) {
        adapter.resetFlowState();
      }

      return createBlockingPromise(() => {
        (async () => {
          const checkId = await resolveReadinessTarget(adapter, targetDeviceId);
          if (checkId) {
            await runReadinessCheck(adapter, checkId);
          }
        })();
      });
    },
    [
      refs,
      setters,
      walletType,
      resolveOrCreateAdapter,
      resolveReadinessTarget,
      runReadinessCheck,
      createBlockingPromise,
      onFlowStart,
      flowActiveRef,
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

    const effectiveDeviceId = lastDeviceIdRef.current;

    if (effectiveDeviceId && adapter) {
      updateConnectionState({ status: ConnectionStatus.Connecting });
      try {
        await tryEnsureReady(adapter, effectiveDeviceId);
      } catch (error) {
        if (flowActiveRef.current) {
          handleError(error);
        }
      }
    } else {
      updateConnectionState({ status: ConnectionStatus.Scanning });
    }
  }, [
    handleError,
    updateConnectionState,
    refs,
    checkTransportEnabledOrShowError,
    tryEnsureReady,
    flowActiveRef,
  ]);

  const closeFlow = useCallback(() => {
    flowActiveRef.current = false;
    refs.abortControllerRef.current?.abort();
    refs.abortControllerRef.current = null;

    const resolvePending = pendingReadyResolveRef.current;
    if (resolvePending) {
      pendingReadyResolveRef.current = null;
      connectionSuccessCallbackRef.current = null;
      resolvePending(false);
    }
    setters.setTargetWalletType(null);
    updateConnectionState({ status: ConnectionStatus.Disconnected });
    // refs is not needed as a dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
