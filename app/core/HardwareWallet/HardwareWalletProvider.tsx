import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';

import { DiscoveredDevice, DeviceSelectionState } from './types';
import HardwareWalletContext from './contexts/HardwareWalletContext';
import { HardwareWalletBottomSheet } from './components';
import { useHardwareWalletStateManager } from './HardwareWalletStateManager';
import { useDeviceEventHandlers } from './HardwareWalletEventHandlers';
import { createAdapter } from './adapters';
import { createHardwareWalletError, parseErrorByType } from './errors';
import { HardwareWalletType, ConnectionStatus } from '@metamask/hw-wallet-sdk';
import DevLogger from '../SDKConnect/utils/DevLogger';

interface HardwareWalletProviderProps {
  children: ReactNode;
}

/**
 * Unified Hardware Wallet Provider
 *
 * This provider manages all hardware wallet state and actions,
 * automatically creating the appropriate adapter based on wallet type
 * and handling device events.
 */
export const HardwareWalletProvider: React.FC<HardwareWalletProviderProps> = ({
  children,
}) => {
  const { state, refs, setters } = useHardwareWalletStateManager();
  const { connectionState, deviceId, walletType, targetWalletType } = state;

  const effectiveWalletType = targetWalletType ?? walletType;

  const [deviceSelectionState, setDeviceSelectionState] =
    useState<DeviceSelectionState>({
      devices: [],
      selectedDevice: null,
      isScanning: false,
      scanError: null,
    });

  const lastOperationRef = useRef<{
    type: 'connect' | 'ensureReady';
    deviceId?: string;
  } | null>(null);

  const connectionSuccessCallbackRef = useRef<(() => void) | null>(null);

  const pendingReadyResolveRef = useRef<((ready: boolean) => void) | null>(
    null,
  );

  const awaitingConfirmationRejectRef = useRef<(() => void) | null>(null);

  const discoveryCleanupRef = useRef<(() => void) | null>(null);

  const [connectionTips, setConnectionTips] = useState<string[]>([]);
  const [isTransportAvailable, setIsTransportAvailable] = useState(false);
  const previousTransportAvailableRef = useRef<boolean | null>(null);
  const transportCleanupRef = useRef<(() => void) | null>(null);

  const { handleDeviceEvent, handleError, clearError, updateConnectionState } =
    useDeviceEventHandlers({
      refs,
      setters,
      walletType: effectiveWalletType,
    });

  /**
   * Create an adapter with the standard onDisconnect / onDeviceEvent callbacks.
   */
  const createAdapterWithCallbacks = useCallback(
    (targetType: HardwareWalletType) =>
      createAdapter(targetType, {
        onDisconnect: (error) => {
          if (error) {
            handleError(error);
          } else {
            updateConnectionState({ status: ConnectionStatus.Disconnected });
          }
        },
        onDeviceEvent: handleDeviceEvent,
      }),
    [handleDeviceEvent, handleError, updateConnectionState],
  );

  /**
   * Store an adapter as the current adapter, sync connection tips, and
   * register transport state monitoring. Automatically cleans up any
   * previous transport subscription before registering a new one.
   */
  const initializeAdapter = useCallback(
    (adapter: ReturnType<typeof createAdapter>): void => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;

      refs.adapterRef.current = adapter;
      setConnectionTips(adapter.getConnectionTips());

      if (adapter.onTransportStateChange) {
        transportCleanupRef.current = adapter.onTransportStateChange(
          (isAvailable) => {
            DevLogger.log(
              '[HardwareWalletProvider] Transport state changed:',
              isAvailable,
            );
            setIsTransportAvailable(isAvailable);
          },
        );
      } else {
        setIsTransportAvailable(true);
      }
    },
    [refs],
  );

  /**
   * Try to ensure a device is ready, then mark the flow complete and
   * transition to Ready state. Returns true if ready, false otherwise.
   */
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
        // Not an error — the adapter emits device events (AppNotOpen, DeviceLocked, etc.)
        // before returning false, so the state machine has already transitioned.
        DevLogger.log(
          '[HardwareWalletProvider] Device not ready — adapter event already handled state transition',
        );
      }
      return isReady;
    },
    [updateConnectionState],
  );

  /**
   * Create a transport-disabled error using the adapter's own error code.
   * Returns null if the adapter doesn't require transport monitoring.
   */
  const createTransportError = useCallback(() => {
    const adapter = refs.adapterRef.current;
    const errorCode = adapter?.getTransportDisabledErrorCode() ?? null;
    if (errorCode === null) {
      return null;
    }
    const targetType =
      effectiveWalletType ?? adapter?.walletType ?? HardwareWalletType.Ledger;
    return createHardwareWalletError(errorCode, targetType);
  }, [effectiveWalletType, refs]);

  // Transport state monitoring
  useEffect(() => {
    const wasAvailable = previousTransportAvailableRef.current;
    previousTransportAvailableRef.current = isTransportAvailable;

    if (wasAvailable !== true || isTransportAvailable !== false) {
      return;
    }

    DevLogger.log(
      '[HardwareWalletProvider] Transport went from available to unavailable',
    );

    const activeStates = [
      ConnectionStatus.Scanning,
      ConnectionStatus.Connecting,
      ConnectionStatus.AwaitingApp,
      ConnectionStatus.AwaitingConfirmation,
      ConnectionStatus.Connected,
    ];

    const isInActiveState = activeStates.includes(connectionState.status);
    const transportError = createTransportError();

    if (isInActiveState && transportError) {
      DevLogger.log(
        '[HardwareWalletProvider] Transport disabled during active operation - showing error',
      );
      updateConnectionState({
        status: ConnectionStatus.ErrorState,
        error: transportError,
      });
    }
  }, [
    isTransportAvailable,
    connectionState.status,
    refs,
    updateConnectionState,
    createTransportError,
  ]);

  // Adapter lifecycle
  useEffect(() => {
    if (refs.adapterRef.current) {
      refs.adapterRef.current.disconnect().catch(() => {
        // Ignore disconnect errors during cleanup
      });
      refs.adapterRef.current = null;
    }

    previousTransportAvailableRef.current = null;

    const adapter = effectiveWalletType
      ? createAdapterWithCallbacks(effectiveWalletType)
      : createAdapter(null, {
          // eslint-disable-next-line no-empty-function
          onDisconnect: () => {},
          onDeviceEvent: handleDeviceEvent,
        });

    initializeAdapter(adapter);

    return () => {
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;
      if (refs.adapterRef.current) {
        refs.adapterRef.current.disconnect().catch(() => {
          // Ignore cleanup errors
        });
        refs.adapterRef.current = null;
      }
    };
  }, [
    effectiveWalletType,
    handleDeviceEvent,
    createAdapterWithCallbacks,
    initializeAdapter,
    refs,
  ]);

  const stopDiscovery = useCallback(() => {
    discoveryCleanupRef.current?.();
    discoveryCleanupRef.current = null;
  }, []);

  const startDiscovery = useCallback(() => {
    const adapter = refs.adapterRef.current;

    stopDiscovery();

    setDeviceSelectionState((prev) => ({
      ...prev,
      devices: [],
      selectedDevice: null,
      isScanning: !!adapter?.requiresDeviceDiscovery,
      scanError: null,
    }));

    if (!adapter?.requiresDeviceDiscovery) return;

    DevLogger.log('[HardwareWalletProvider] Starting adapter device discovery');

    const cleanupFn = adapter.startDeviceDiscovery(
      (device: DiscoveredDevice) => {
        DevLogger.log(
          '[HardwareWalletProvider] Device found:',
          device.name,
          device.id,
        );
        setDeviceSelectionState((prev) => {
          const exists = prev.devices.some((d) => d.id === device.id);
          if (exists) return prev;
          return {
            ...prev,
            devices: [...prev.devices, device],
          };
        });
      },
      (error: Error) => {
        DevLogger.log(
          '[HardwareWalletProvider] Device discovery error:',
          error,
        );
        const scanError = parseErrorByType(
          error,
          effectiveWalletType ??
            adapter.walletType ??
            HardwareWalletType.Ledger,
        );
        updateConnectionState({
          status: ConnectionStatus.ErrorState,
          error: scanError,
        });
      },
    );

    discoveryCleanupRef.current = () => {
      cleanupFn?.();
      adapter.stopDeviceDiscovery();
    };
  }, [refs, effectiveWalletType, updateConnectionState, stopDiscovery]);

  // Device discovery — start/stop based on connection status
  useEffect(() => {
    if (connectionState.status === ConnectionStatus.Scanning) {
      DevLogger.log('[HardwareWalletProvider] Scanning state entered');
      startDiscovery();
      return () => stopDiscovery();
    }

    stopDiscovery();
    setDeviceSelectionState({
      devices: [],
      selectedDevice: null,
      isScanning: false,
      scanError: null,
    });
    return undefined;
  }, [connectionState.status, startDiscovery, stopDiscovery]);

  const closeDeviceSelection = useCallback(() => {
    if (pendingReadyResolveRef.current) {
      pendingReadyResolveRef.current(false);
      pendingReadyResolveRef.current = null;
    }
    setters.setTargetWalletType(null);
    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [setters, updateConnectionState]);

  const selectDevice = useCallback((device: DiscoveredDevice) => {
    setDeviceSelectionState((prev) => ({
      ...prev,
      selectedDevice: device,
    }));
  }, []);

  const rescan = useCallback(() => {
    startDiscovery();
  }, [startDiscovery]);

  const closeBottomSheet = useCallback(() => {
    setters.setTargetWalletType(null);
    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [setters, updateConnectionState]);

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
        setters.setDeviceId(targetDeviceId);

        if (pendingReadyResolveRef.current) {
          DevLogger.log(
            '[HardwareWalletProvider] Connect succeeded, continuing readiness check...',
          );

          try {
            await tryEnsureReady(adapter, targetDeviceId);
          } catch (error) {
            DevLogger.log(
              '[HardwareWalletProvider] Readiness check failed:',
              error,
            );
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
        '[HardwareWalletProvider] ensureDeviceReady called with deviceId:',
        targetDeviceId,
      );

      if (pendingReadyResolveRef.current) {
        DevLogger.log(
          '[HardwareWalletProvider] Abandoning previous pending readiness check (not resolving)',
        );
        pendingReadyResolveRef.current = null;
      }

      const targetType = effectiveWalletType ?? HardwareWalletType.Ledger;
      const shouldStartFresh = targetDeviceId === undefined;
      const deviceIdToUse = shouldStartFresh ? undefined : targetDeviceId;

      // Ensure correct adapter type
      const existingAdapter = refs.adapterRef.current;
      const needsNewAdapter =
        !existingAdapter || existingAdapter.walletType !== targetType;

      const adapter = needsNewAdapter
        ? (() => {
            DevLogger.log(
              '[HardwareWalletProvider] Creating adapter for:',
              targetType,
              '(existing was:',
              existingAdapter?.walletType,
              ')',
            );
            // eslint-disable-next-line no-empty-function
            existingAdapter?.disconnect().catch(() => {});
            const newAdapter = createAdapterWithCallbacks(targetType);
            initializeAdapter(newAdapter);
            return newAdapter;
          })()
        : existingAdapter;

      if (adapter.resetFlowState) {
        adapter.resetFlowState();
      }

      lastOperationRef.current = {
        type: 'ensureReady',
        deviceId: deviceIdToUse,
      };

      // Check transport availability before proceeding
      DevLogger.log(
        '[HardwareWalletProvider] Checking transport availability...',
      );
      const isTransportReady = await adapter.isTransportAvailable();
      DevLogger.log(
        '[HardwareWalletProvider] Transport available:',
        isTransportReady,
      );

      const transportError = createTransportError();
      if (!isTransportReady && transportError) {
        DevLogger.log(
          '[HardwareWalletProvider] Transport unavailable - showing error immediately',
        );
        updateConnectionState({
          status: ConnectionStatus.ErrorState,
          error: transportError,
        });

        return new Promise<boolean>((resolve) => {
          pendingReadyResolveRef.current = resolve;
          connectionSuccessCallbackRef.current = () => {
            if (pendingReadyResolveRef.current === resolve) {
              pendingReadyResolveRef.current = null;
              resolve(true);
            }
          };
        });
      }

      return new Promise<boolean>((resolve) => {
        pendingReadyResolveRef.current = resolve;

        connectionSuccessCallbackRef.current = () => {
          DevLogger.log(
            '[HardwareWalletProvider] Success callback - resolving with true',
          );
          if (pendingReadyResolveRef.current === resolve) {
            pendingReadyResolveRef.current = null;
            resolve(true);
          }
        };

        if (!deviceIdToUse) {
          DevLogger.log(
            '[HardwareWalletProvider] No device ID - starting device selection',
          );
          updateConnectionState({ status: ConnectionStatus.Scanning });
          return;
        }

        DevLogger.log(
          '[HardwareWalletProvider] Have device ID, checking readiness...',
        );

        updateConnectionState({ status: ConnectionStatus.Connecting });

        (async () => {
          try {
            refs.abortControllerRef.current = new AbortController();

            DevLogger.log(
              '[HardwareWalletProvider] Calling adapter.ensureDeviceReady...',
            );
            await tryEnsureReady(adapter, deviceIdToUse);
          } catch (error) {
            DevLogger.log(
              '[HardwareWalletProvider] ensureDeviceReady error:',
              error,
            );
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
      effectiveWalletType,
      updateConnectionState,
      createAdapterWithCallbacks,
      initializeAdapter,
      tryEnsureReady,
      createTransportError,
    ],
  );

  const showHardwareWalletError = useCallback(
    (error: unknown) => {
      DevLogger.log('[HardwareWalletProvider] showHardwareWalletError:', error);
      handleError(error);
    },
    [handleError],
  );

  const clearErrorState = useCallback(() => {
    clearError();
  }, [clearError]);

  const retryLastOperation = useCallback(async (): Promise<void> => {
    const adapter = refs.adapterRef.current;
    if (adapter?.resetFlowState) {
      adapter.resetFlowState();
    }

    const lastOp = lastOperationRef.current;
    if (!lastOp) {
      clearErrorState();
      return;
    }

    if (adapter) {
      const isTransportReady = await adapter.isTransportAvailable();
      const retryTransportError = createTransportError();
      if (!isTransportReady && retryTransportError) {
        DevLogger.log(
          '[HardwareWalletProvider] Retry: Transport still unavailable',
        );
        updateConnectionState({
          status: ConnectionStatus.ErrorState,
          error: retryTransportError,
        });
        return;
      }
    }

    if (lastOp.type === 'ensureReady') {
      if (lastOp.deviceId && adapter) {
        updateConnectionState({ status: ConnectionStatus.Connecting });
        try {
          await tryEnsureReady(adapter, lastOp.deviceId);
        } catch (error) {
          handleError(error);
        }
      } else {
        DevLogger.log(
          '[HardwareWalletProvider] Retry: No deviceId - restarting device selection',
        );
        updateConnectionState({ status: ConnectionStatus.Scanning });
      }
      return;
    }

    switch (lastOp.type) {
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
    clearErrorState,
    handleError,
    updateConnectionState,
    refs,
    createTransportError,
    tryEnsureReady,
  ]);

  const showAwaitingConfirmation = useCallback(
    (operationType: 'transaction' | 'message', onReject?: () => void) => {
      DevLogger.log(
        '[HardwareWalletProvider] showAwaitingConfirmation:',
        operationType,
      );
      awaitingConfirmationRejectRef.current = onReject ?? null;

      const currentDeviceId = deviceId ?? 'unknown';

      updateConnectionState({
        status: ConnectionStatus.AwaitingConfirmation,
        deviceId: currentDeviceId,
        operationType,
      });
    },
    [deviceId, updateConnectionState],
  );

  const hideAwaitingConfirmation = useCallback(() => {
    DevLogger.log('[HardwareWalletProvider] hideAwaitingConfirmation');
    awaitingConfirmationRejectRef.current = null;
    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [updateConnectionState]);

  const handleAwaitingConfirmationCancel = useCallback(() => {
    DevLogger.log('[HardwareWalletProvider] handleAwaitingConfirmationCancel');
    const onReject = awaitingConfirmationRejectRef.current;
    if (onReject) {
      onReject();
    }
    hideAwaitingConfirmation();
  }, [hideAwaitingConfirmation]);

  const handleConnectionSuccess = useCallback(() => {
    const callback = connectionSuccessCallbackRef.current;
    if (callback) {
      connectionSuccessCallbackRef.current = null;
      callback();
    }

    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [updateConnectionState]);

  const contextValue = useMemo(
    () => ({
      walletType: effectiveWalletType,
      deviceId,
      connectionState,
      deviceSelection: deviceSelectionState,
      ensureDeviceReady,
      setTargetWalletType: setters.setTargetWalletType,
      showHardwareWalletError,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
    }),
    [
      effectiveWalletType,
      deviceId,
      connectionState,
      deviceSelectionState,
      ensureDeviceReady,
      setters.setTargetWalletType,
      showHardwareWalletError,
      showAwaitingConfirmation,
      hideAwaitingConfirmation,
    ],
  );

  return (
    <HardwareWalletContext.Provider value={contextValue}>
      {children}
      <HardwareWalletBottomSheet
        connectionState={connectionState}
        deviceSelection={deviceSelectionState}
        walletType={effectiveWalletType}
        connectionTips={connectionTips}
        retryLastOperation={retryLastOperation}
        closeDeviceSelection={closeDeviceSelection}
        selectDevice={selectDevice}
        rescan={rescan}
        connect={connect}
        onCancel={closeBottomSheet}
        onClose={closeBottomSheet}
        onAwaitingConfirmationCancel={handleAwaitingConfirmationCancel}
        onConnectionSuccess={handleConnectionSuccess}
      />
    </HardwareWalletContext.Provider>
  );
};
