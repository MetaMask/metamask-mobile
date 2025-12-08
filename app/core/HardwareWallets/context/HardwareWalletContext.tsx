/**
 * Hardware Wallet Context Provider
 *
 * Provides centralized state management for hardware wallet operations
 * across all supported wallet types (Ledger, Trezor, QR).
 *
 * When the selected account is not a hardware wallet account, all context
 * actions become no-ops for safety.
 */

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { useSelector } from 'react-redux';
import {
  BluetoothState,
  ConnectionState,
  ConnectionStatus,
  DeviceEvent,
  DeviceEventPayload,
  HardwareWalletAdapter,
  HardwareWalletAdapterOptions,
  HardwareWalletConnectionState,
  HardwareWalletContextType,
  HardwareWalletErrorCode,
  HardwareWalletType,
  Unsubscribe,
} from '../types';
import { createAdapter } from '../adapters';
import {
  createHardwareWalletError,
  getConnectionStateFromError,
  parseErrorByType,
} from '../errors';
import { AppSwitchRequiredError } from '../adapters/LedgerAdapter';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Logger from '../../../util/Logger';
import useApprovalRequest from '../../../components/Views/confirmations/hooks/useApprovalRequest';
import { useTransactionMetadataRequest } from '../../../components/Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { getInternalAccountByAddress } from '../../../util/address';
import { getDeviceId } from '../../Ledger/Ledger';
import { HardwareWalletErrorModal } from '../components';

// ============================================================================
// Constants & Types
// ============================================================================

const LOG_TAG = 'HardwareWalletContext';
const RECONNECT_DELAY_MS = 500;

interface AdapterCallbackDependencies {
  setConnectionState: React.Dispatch<
    React.SetStateAction<HardwareWalletConnectionState>
  >;
  setBluetoothState: React.Dispatch<React.SetStateAction<BluetoothState>>;
  abortSignal: AbortSignal;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map keyring type to HardwareWalletType
 */
const keyringTypeToHardwareWalletType = (
  keyringType: string | undefined,
): HardwareWalletType | null => {
  switch (keyringType) {
    case ExtendedKeyringTypes.ledger:
      return HardwareWalletType.LEDGER;
    case ExtendedKeyringTypes.qr:
      return HardwareWalletType.QR;
    default:
      return null;
  }
};

/**
 * Set pending operation flag on adapter (if supported)
 */
const setAdapterPendingOperation = (
  adapter: HardwareWalletAdapter,
  pending: boolean,
): void => {
  adapter.setPendingOperation?.(pending);
};

/**
 * Create adapter options with callbacks
 */
const createAdapterOptions = (
  type: HardwareWalletType,
  handleDisconnect: (error?: unknown) => void,
  handleDeviceEvent: (payload: DeviceEventPayload) => void,
  deps: AdapterCallbackDependencies,
): HardwareWalletAdapterOptions => ({
  onDisconnect: handleDisconnect,
  onAwaitingConfirmation: () => {
    if (!deps.abortSignal.aborted) {
      deps.setConnectionState(ConnectionState.awaitingConfirmation());
    }
  },
  onDeviceLocked: () => {
    if (!deps.abortSignal.aborted) {
      Logger.log(LOG_TAG, 'Device locked detected');
      const lockedError = createHardwareWalletError(
        HardwareWalletErrorCode.DEVICE_LOCKED,
        type,
      );
      deps.setConnectionState(ConnectionState.error('locked', lockedError));
    }
  },
  onAppNotOpen: () => {
    if (!deps.abortSignal.aborted) {
      Logger.log(LOG_TAG, 'App not open detected');
      deps.setConnectionState(ConnectionState.awaitingApp('not_open'));
    }
  },
  onBluetoothStateChange: (state: BluetoothState) => {
    if (!deps.abortSignal.aborted) {
      Logger.log(LOG_TAG, `Bluetooth state changed: ${state}`);
      deps.setBluetoothState(state);
    }
  },
  onPairingRemoved: (deviceName?: string, productName?: string) => {
    if (!deps.abortSignal.aborted) {
      Logger.log(
        LOG_TAG,
        `Pairing removed for device: ${deviceName ?? 'unknown'} (${productName ?? 'unknown'})`,
      );
      const pairingError = createHardwareWalletError(
        HardwareWalletErrorCode.CONNECTION_FAILED,
        type,
      );
      deps.setConnectionState(
        ConnectionState.error('pairing_removed', pairingError),
      );
    }
  },
  onDeviceEvent: handleDeviceEvent,
});

// No-op functions for non-hardware wallet accounts
const noopAsync = async (): Promise<void> => undefined;
const noop = (): void => undefined;

/**
 * Default context value (for non-hardware wallet accounts)
 */
const defaultContextValue: HardwareWalletContextType = {
  isHardwareWalletAccount: false,
  detectedWalletType: null,
  walletType: null,
  connectionState: ConnectionState.disconnected(),
  deviceId: null,
  bluetoothState: BluetoothState.UNKNOWN,
  isBluetoothAvailable: false,
  currentAppName: null,
  connect: noopAsync,
  disconnect: noopAsync,
  executeWithWallet: async () => {
    throw new Error(
      'Cannot execute hardware wallet operation: selected account is not a hardware wallet',
    );
  },
  clearError: noop,
  retry: noopAsync,
  startBluetoothStateObservation: noop,
  stopBluetoothStateObservation: noop,
  verifyEthereumApp: async () => false,
};

export const HardwareWalletContext =
  createContext<HardwareWalletContextType>(defaultContextValue);

interface HardwareWalletProviderProps {
  children: ReactNode;
}

export const HardwareWalletProvider: React.FC<HardwareWalletProviderProps> = ({
  children,
}) => {
  // ============================================================================
  // Account Detection
  // ============================================================================

  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const accountToUse = useMemo(() => {
    if (approvalRequest?.requestData?.from) {
      return getInternalAccountByAddress(approvalRequest.requestData.from);
    }
    if (transactionMetadata?.txParams?.from) {
      return getInternalAccountByAddress(transactionMetadata.txParams.from);
    }
    return selectedAccount;
  }, [approvalRequest, transactionMetadata, selectedAccount]);

  const keyringType = accountToUse?.metadata?.keyring?.type;
  const detectedWalletType = keyringTypeToHardwareWalletType(keyringType);
  const isHardwareWalletAccount = detectedWalletType !== null;
  const accountAddress = accountToUse?.address;

  // ============================================================================
  // State
  // ============================================================================

  const [walletType, setWalletType] = useState<HardwareWalletType | null>(null);
  const [connectionState, setConnectionState] =
    useState<HardwareWalletConnectionState>(ConnectionState.disconnected());
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [bluetoothState, setBluetoothState] = useState<BluetoothState>(
    BluetoothState.UNKNOWN,
  );
  const [currentAppName, setCurrentAppName] = useState<string | null>(null);

  // Derived state
  const isBluetoothAvailable = bluetoothState === BluetoothState.POWERED_ON;

  // ============================================================================
  // Refs
  // ============================================================================

  // Core refs
  const adapterRef = useRef<HardwareWalletAdapter | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // State refs (for use in callbacks without dependencies)
  const walletTypeRef = useRef<HardwareWalletType | null>(null);

  // Operation refs
  const pendingOperationRef = useRef<(() => Promise<unknown>) | null>(null);
  const bluetoothSubscriptionRef = useRef<Unsubscribe | null>(null);

  // Connection guards
  const isConnectingRef = useRef(false);
  const hasAutoConnectedRef = useRef(false);
  const lastConnectedAccountRef = useRef<string | null>(null);

  // ============================================================================
  // Stable Callbacks (no/minimal dependencies to prevent infinite loops)
  // ============================================================================

  /**
   * Handle device events from the adapter.
   * Uses functional state updates to avoid dependencies on connectionState.
   */
  const handleDeviceEvent = useCallback((payload: DeviceEventPayload) => {
    // Check if aborted (component unmounted)
    if (abortControllerRef.current?.signal.aborted) return;

    Logger.log(LOG_TAG, 'Device event:', payload.event, payload);

    switch (payload.event) {
      case DeviceEvent.DISCONNECTED:
        // Don't update state if we're in the middle of a connection attempt
        // The connect function and handleDisconnect will handle this
        if (!isConnectingRef.current) {
          setConnectionState(ConnectionState.disconnected());
        }
        break;

      case DeviceEvent.DEVICE_LOCKED:
        setConnectionState(ConnectionState.error('locked', payload.error));
        break;

      case DeviceEvent.APP_NOT_OPEN:
        setConnectionState(ConnectionState.awaitingApp('not_open'));
        break;

      case DeviceEvent.APP_CHANGED:
        Logger.log(
          LOG_TAG,
          `App changed: ${payload.previousAppName} -> ${payload.currentAppName}`,
        );
        setCurrentAppName(payload.currentAppName || null);

        // Check if we're now on the wrong app
        if (payload.currentAppName && payload.currentAppName !== 'Ethereum') {
          setConnectionState(
            ConnectionState.awaitingApp('wrong_app', payload.currentAppName),
          );
        } else {
          // Use functional update to check current state without adding dependency
          setConnectionState((prevState) => {
            if (prevState.status === ConnectionStatus.AWAITING_APP) {
              return ConnectionState.connected();
            }
            return prevState;
          });
        }
        break;

      case DeviceEvent.BLUETOOTH_STATE_CHANGED:
        if (payload.bluetoothState) {
          setBluetoothState(payload.bluetoothState);

          // If Bluetooth turned off while connected, show error
          // Use functional update to check current state without adding dependency
          if (payload.bluetoothState === BluetoothState.POWERED_OFF) {
            setConnectionState((prevState) => {
              if (prevState.status === ConnectionStatus.CONNECTED) {
                const btError = createHardwareWalletError(
                  HardwareWalletErrorCode.BLUETOOTH_OFF,
                  walletTypeRef.current || HardwareWalletType.LEDGER,
                );
                return ConnectionState.error('bluetooth_off', btError);
              }
              return prevState;
            });
          }
        }
        break;

      case DeviceEvent.PAIRING_REMOVED:
        setConnectionState(
          ConnectionState.error('pairing_removed', payload.error),
        );
        break;

      case DeviceEvent.CONNECTION_FAILED:
        setConnectionState(
          ConnectionState.error('connection_failed', payload.error),
        );
        break;

      case DeviceEvent.OPERATION_TIMEOUT:
        // Keep existing state, just log the timeout
        Logger.log(LOG_TAG, 'Operation timeout', payload.error);
        break;
    }
  }, []);

  /**
   * Handle adapter disconnect event.
   * Uses walletTypeRef to avoid dependency changes.
   */
  const handleDisconnect = useCallback((disconnectError?: unknown) => {
    if (abortControllerRef.current?.signal.aborted) return;

    Logger.log(
      LOG_TAG,
      'Disconnect handler called',
      disconnectError,
      `isConnecting: ${isConnectingRef.current}`,
    );

    if (isConnectingRef.current) {
      Logger.log(LOG_TAG, 'Ignoring disconnect during connection attempt');
      return;
    }

    adapterRef.current = null;
    isConnectingRef.current = false;

    const currentWalletType = walletTypeRef.current;
    if (disconnectError && currentWalletType) {
      const hwError = parseErrorByType(disconnectError, currentWalletType);
      setConnectionState(getConnectionStateFromError(hwError));
    } else {
      setConnectionState(ConnectionState.disconnected());
    }
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize AbortController and cleanup on unmount
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
      adapterRef.current?.destroy();
      bluetoothSubscriptionRef.current?.();
    };
  }, []);

  // Sync walletTypeRef with walletType state
  useEffect(() => {
    walletTypeRef.current = walletType;
  }, [walletType]);

  // ============================================================================
  // Connection Actions
  // ============================================================================

  /**
   * Connect to a hardware wallet
   */
  const connect = useCallback(
    async (type: HardwareWalletType, id: string): Promise<void> => {
      const abortSignal = abortControllerRef.current?.signal;

      // No-op if not a hardware wallet account or aborted
      if (!isHardwareWalletAccount) return;
      if (abortSignal?.aborted) return;

      // Prevent multiple simultaneous connection attempts
      if (isConnectingRef.current) {
        Logger.log(LOG_TAG, 'Connection already in progress, skipping');
        return;
      }

      isConnectingRef.current = true;
      Logger.log(LOG_TAG, `Connecting to ${type} device: ${id}`);

      // Reset state
      setWalletType(type);
      setDeviceId(id);
      setConnectionState(ConnectionState.connecting());

      try {
        // Clean up existing adapter if any
        adapterRef.current?.destroy();

        // Create new adapter with callbacks using extracted helper
        const adapterOptions = createAdapterOptions(
          type,
          handleDisconnect,
          handleDeviceEvent,
          {
            setConnectionState,
            setBluetoothState,
            abortSignal: abortSignal || new AbortController().signal,
          },
        );
        const adapter = createAdapter(type, adapterOptions);

        adapterRef.current = adapter;

        await adapter.connect(id);

        if (!abortSignal?.aborted) {
          Logger.log(LOG_TAG, 'Connected successfully');
          setConnectionState(ConnectionState.connected());
          setCurrentAppName('Ethereum'); // We verified ETH app in connect
        }
        isConnectingRef.current = false;
      } catch (err) {
        Logger.log(LOG_TAG, 'Connection error', err);

        // Handle app switch scenario (Ledger)
        if (err instanceof AppSwitchRequiredError) {
          if (!abortSignal?.aborted) {
            setConnectionState(ConnectionState.awaitingApp('not_open'));
          }

          // Wait for device to reconnect after app switch
          // Note: We keep isConnectingRef true during app switch to prevent duplicate attempts
          setTimeout(async () => {
            if (abortSignal?.aborted) {
              isConnectingRef.current = false;
              return;
            }

            try {
              const currentAdapter = adapterRef.current;
              if (currentAdapter) {
                await currentAdapter.connect(id);
                if (!abortSignal?.aborted) {
                  setConnectionState(ConnectionState.connected());
                }
              }
            } catch (reconnectErr) {
              if (reconnectErr instanceof AppSwitchRequiredError) {
                // Still waiting for app switch, don't reset connecting flag
                return;
              }
              if (!abortSignal?.aborted) {
                const hwError = parseErrorByType(reconnectErr, type);
                setConnectionState(getConnectionStateFromError(hwError));
              }
            } finally {
              isConnectingRef.current = false;
            }
          }, RECONNECT_DELAY_MS);
          return;
        }

        if (!abortSignal?.aborted) {
          const hwError = parseErrorByType(err, type);
          setConnectionState(getConnectionStateFromError(hwError));
        }
        adapterRef.current?.destroy();
        adapterRef.current = null;
        isConnectingRef.current = false;
      }
    },
    [handleDeviceEvent, handleDisconnect, isHardwareWalletAccount],
  );

  // Cleanup when selected account changes to non-hardware wallet
  useEffect(() => {
    if (!isHardwareWalletAccount && adapterRef.current) {
      adapterRef.current.destroy();
      adapterRef.current = null;
      setConnectionState(ConnectionState.disconnected());
      setWalletType(null);
      setDeviceId(null);
      setCurrentAppName(null);
      pendingOperationRef.current = null;
      isConnectingRef.current = false;
      hasAutoConnectedRef.current = false;
      lastConnectedAccountRef.current = null;
    }
  }, [isHardwareWalletAccount]);

  // Auto-connect when hardware wallet account is detected
  // Note: We intentionally exclude `connect` from dependencies to prevent infinite loops.
  // The connect function changes when connectionState changes (via handleDeviceEvent),
  // which would cause this effect to re-run and call connect again after a successful connection.
  useEffect(() => {
    if (!isHardwareWalletAccount) {
      // Reset refs when switching away from hardware wallet
      hasAutoConnectedRef.current = false;
      lastConnectedAccountRef.current = null;
      return;
    }

    const abortSignal = abortControllerRef.current?.signal;

    // Skip if we've already auto-connected for this account
    if (
      hasAutoConnectedRef.current &&
      lastConnectedAccountRef.current === accountAddress
    ) {
      Logger.log(
        LOG_TAG,
        'Skipping auto-connect: already connected for this account',
      );
      return;
    }

    getDeviceId().then((id) => {
      if (abortSignal?.aborted) return;

      // Only update deviceId if it changed
      setDeviceId((prevId) => (prevId !== id ? id : prevId));

      // Only auto-connect if:
      // 1. We have a detected wallet type and device ID
      // 2. We're not already connected or connecting
      // 3. The adapter is not already set up
      // 4. We haven't already initiated connection for this account
      if (
        detectedWalletType &&
        id &&
        !adapterRef.current?.isConnected() &&
        !isConnectingRef.current &&
        !hasAutoConnectedRef.current
      ) {
        Logger.log(LOG_TAG, 'Auto-connecting for account:', accountAddress);
        hasAutoConnectedRef.current = true;
        lastConnectedAccountRef.current = accountAddress ?? null;
        connect(detectedWalletType, id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHardwareWalletAccount, accountAddress, detectedWalletType]);

  // ============================================================================
  // Context Actions
  // ============================================================================

  /**
   * Disconnect from the hardware wallet
   */
  const disconnect = useCallback(async (): Promise<void> => {
    // No-op if not a hardware wallet account
    if (!isHardwareWalletAccount) return;

    try {
      await adapterRef.current?.disconnect();
    } finally {
      adapterRef.current?.destroy();
      adapterRef.current = null;
      if (!abortControllerRef.current?.signal.aborted) {
        setConnectionState(ConnectionState.disconnected());
        setWalletType(null);
        setDeviceId(null);
      }
      pendingOperationRef.current = null;
    }
  }, [isHardwareWalletAccount]);

  /**
   * Execute an operation with the hardware wallet
   */
  const executeWithWallet = useCallback(
    async <T,>(
      operation: (adapter: HardwareWalletAdapter) => Promise<T>,
    ): Promise<T> => {
      const abortSignal = abortControllerRef.current?.signal;

      if (!isHardwareWalletAccount) {
        throw new Error(
          'Cannot execute hardware wallet operation: selected account is not a hardware wallet',
        );
      }

      const adapter = adapterRef.current;
      if (!adapter) {
        throw new Error('No hardware wallet connected');
      }

      const currentWalletType = walletType;
      if (!currentWalletType) {
        throw new Error('No wallet type set');
      }

      pendingOperationRef.current = () => operation(adapter);

      try {
        if (!abortSignal?.aborted) {
          setConnectionState(ConnectionState.awaitingConfirmation());
        }

        setAdapterPendingOperation(adapter, true);
        const result = await operation(adapter);
        setAdapterPendingOperation(adapter, false);

        if (!abortSignal?.aborted) {
          setConnectionState(ConnectionState.connected());
        }
        pendingOperationRef.current = null;

        return result;
      } catch (err) {
        setAdapterPendingOperation(adapter, false);

        if (!abortSignal?.aborted) {
          const hwError = parseErrorByType(err, currentWalletType);
          setConnectionState(getConnectionStateFromError(hwError));
        }
        throw err;
      }
    },
    [isHardwareWalletAccount, walletType],
  );

  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    // No-op if not a hardware wallet account or aborted
    if (!isHardwareWalletAccount) return;
    if (abortControllerRef.current?.signal.aborted) return;

    if (adapterRef.current?.isConnected()) {
      setConnectionState(ConnectionState.connected());
    } else {
      setConnectionState(ConnectionState.disconnected());
    }
  }, [isHardwareWalletAccount]);

  /**
   * Retry the last operation or reconnect
   */
  const retry = useCallback(async (): Promise<void> => {
    const abortSignal = abortControllerRef.current?.signal;

    // No-op if not a hardware wallet account or aborted
    if (!isHardwareWalletAccount) return;
    if (abortSignal?.aborted) return;

    Logger.log(LOG_TAG, 'Retry requested');

    const currentWalletType = walletType;

    if (pendingOperationRef.current && adapterRef.current?.isConnected()) {
      try {
        if (!abortSignal?.aborted) {
          setConnectionState(ConnectionState.awaitingConfirmation());
        }
        await pendingOperationRef.current();
        if (!abortSignal?.aborted) {
          setConnectionState(ConnectionState.connected());
        }
        pendingOperationRef.current = null;
      } catch (err) {
        if (!abortSignal?.aborted && currentWalletType) {
          const hwError = parseErrorByType(err, currentWalletType);
          setConnectionState(getConnectionStateFromError(hwError));
        }
      }
    } else if (deviceId && currentWalletType) {
      await connect(currentWalletType, deviceId);
    }
  }, [connect, deviceId, isHardwareWalletAccount, walletType]);

  /**
   * Start observing Bluetooth state changes
   */
  const startBluetoothStateObservation = useCallback(() => {
    if (!isHardwareWalletAccount) return;
    if (bluetoothSubscriptionRef.current) return; // Already subscribed

    Logger.log(LOG_TAG, 'Starting Bluetooth state observation');

    const adapter = adapterRef.current;
    if (adapter?.subscribeToBluetoothState) {
      bluetoothSubscriptionRef.current = adapter.subscribeToBluetoothState();
    }
  }, [isHardwareWalletAccount]);

  /**
   * Stop observing Bluetooth state changes
   */
  const stopBluetoothStateObservation = useCallback(() => {
    if (bluetoothSubscriptionRef.current) {
      Logger.log(LOG_TAG, 'Stopping Bluetooth state observation');
      bluetoothSubscriptionRef.current();
      bluetoothSubscriptionRef.current = null;
    }
  }, []);

  /**
   * Verify that the Ethereum app is still open on the device
   * This queries the device and updates the state accordingly.
   * @returns true if Ethereum app is open, false otherwise
   */
  const verifyEthereumApp = useCallback(async (): Promise<boolean> => {
    const abortSignal = abortControllerRef.current?.signal;

    if (!isHardwareWalletAccount) return false;

    const adapter = adapterRef.current;
    if (!adapter?.getCurrentAppName) {
      Logger.log(LOG_TAG, 'Adapter does not support getCurrentAppName');
      return false;
    }

    try {
      Logger.log(LOG_TAG, 'Verifying Ethereum app is open');
      const appName = await adapter.getCurrentAppName();

      if (!abortSignal?.aborted) {
        setCurrentAppName(appName);

        if (appName === 'Ethereum') {
          return true;
        }
        // Wrong app is open
        Logger.log(LOG_TAG, `Wrong app open: ${appName}`);
        setConnectionState(ConnectionState.awaitingApp('wrong_app', appName));
        return false;
      }
      return appName === 'Ethereum';
    } catch (err) {
      Logger.log(LOG_TAG, 'Failed to verify Ethereum app', err);
      // If we can't check the app, assume it's disconnected
      if (!abortSignal?.aborted && walletType) {
        const hwError = parseErrorByType(err, walletType);
        setConnectionState(getConnectionStateFromError(hwError));
      }
      return false;
    }
  }, [isHardwareWalletAccount, walletType]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue = useMemo<HardwareWalletContextType>(
    () => ({
      isHardwareWalletAccount,
      detectedWalletType,
      walletType,
      connectionState,
      deviceId,
      bluetoothState,
      isBluetoothAvailable,
      currentAppName,
      connect,
      disconnect,
      executeWithWallet,
      clearError,
      retry,
      startBluetoothStateObservation,
      stopBluetoothStateObservation,
      verifyEthereumApp,
    }),
    [
      isHardwareWalletAccount,
      detectedWalletType,
      walletType,
      connectionState,
      deviceId,
      bluetoothState,
      isBluetoothAvailable,
      currentAppName,
      connect,
      disconnect,
      executeWithWallet,
      clearError,
      retry,
      startBluetoothStateObservation,
      stopBluetoothStateObservation,
      verifyEthereumApp,
    ],
  );

  return (
    <HardwareWalletContext.Provider value={contextValue}>
      {children}
      {connectionState.status === ConnectionStatus.ERROR && (
        <HardwareWalletErrorModal onDismiss={clearError} />
      )}
    </HardwareWalletContext.Provider>
  );
};

export default HardwareWalletProvider;
