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
  const flowCompleteRef = useRef(false);

  const pendingReadyResolveRef = useRef<((ready: boolean) => void) | null>(
    null,
  );

  const awaitingConfirmationRejectRef = useRef<(() => void) | null>(null);

  const [isTransportAvailable, setIsTransportAvailable] = useState(false);
  const previousTransportAvailableRef = useRef<boolean | null>(null);

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

    refs.adapterRef.current = adapter;

    let transportCleanup: (() => void) | undefined;
    if (adapter.onTransportStateChange) {
      transportCleanup = adapter.onTransportStateChange((isAvailable) => {
        DevLogger.log(
          '[HardwareWalletProvider] Transport state changed:',
          isAvailable,
        );
        setIsTransportAvailable(isAvailable);
      });
    } else {
      setIsTransportAvailable(true);
    }

    return () => {
      transportCleanup?.();
      if (refs.adapterRef.current) {
        refs.adapterRef.current.disconnect().catch(() => {
          // Ignore cleanup errors
        });
      }
    };
  }, [
    effectiveWalletType,
    handleDeviceEvent,
    createAdapterWithCallbacks,
    refs,
  ]);

  // Device discovery
  useEffect(() => {
    let cleanupFn: (() => void) | undefined;

    const adapter = refs.adapterRef.current;

    if (
      connectionState.status === ConnectionStatus.Scanning &&
      adapter?.requiresDeviceDiscovery
    ) {
      DevLogger.log('[HardwareWalletProvider] Scanning state entered');

      setDeviceSelectionState((prev) => ({
        ...prev,
        devices: [],
        isScanning: true,
        scanError: null,
      }));

      DevLogger.log(
        '[HardwareWalletProvider] Starting adapter device discovery',
      );

      cleanupFn = adapter.startDeviceDiscovery(
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

      return () => {
        DevLogger.log('[HardwareWalletProvider] Cleaning up device discovery');
        cleanupFn?.();
        adapter.stopDeviceDiscovery();
      };
    }

    if (connectionState.status !== ConnectionStatus.Scanning) {
      setDeviceSelectionState({
        devices: [],
        selectedDevice: null,
        isScanning: false,
        scanError: null,
      });
    }

    return () => {
      cleanupFn?.();
      if (adapter) {
        adapter.stopDeviceDiscovery();
      }
    };
  }, [
    connectionState.status,
    effectiveWalletType,
    refs,
    updateConnectionState,
  ]);

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
    setDeviceSelectionState({
      devices: [],
      selectedDevice: null,
      isScanning: true,
      scanError: null,
    });
  }, []);

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
        type: 'ensureReady',
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

      flowCompleteRef.current = false;

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
            const newAdapter = createAdapterWithCallbacks(targetType);
            refs.adapterRef.current = newAdapter;
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

    clearErrorState();

    const lastOp = lastOperationRef.current;
    if (!lastOp) {
      return;
    }

    // Check transport before retrying
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
    flowCompleteRef.current = true;
    if (refs.adapterRef.current) {
      refs.adapterRef.current.markFlowComplete();
    }

    const callback = connectionSuccessCallbackRef.current;
    if (callback) {
      connectionSuccessCallbackRef.current = null;
      callback();
    }

    updateConnectionState({ status: ConnectionStatus.Disconnected });
  }, [refs, updateConnectionState]);

  // Get connection tips from the adapter for the bottom sheet
  const connectionTips = useMemo(
    () => refs.adapterRef.current?.getConnectionTips() ?? [],
    // Re-derive when adapter changes (effectiveWalletType drives adapter creation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveWalletType],
  );

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
