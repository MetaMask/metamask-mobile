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
  HardwareWalletConnectionState,
  HardwareWalletContextType,
  HardwareWalletError,
  HardwareWalletErrorCode,
  HardwareWalletType,
  Unsubscribe,
} from '../types';
import { createAdapter } from '../adapters';
import { parseLedgerError, createHardwareWalletError } from '../errors';
import { AppSwitchRequiredError } from '../adapters/LedgerAdapter';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import Logger from '../../../util/Logger';

const LOG_TAG = 'HardwareWalletContext';
const RECONNECT_DELAY_MS = 500; // Delay for app switch reconnection

/**
 * Check if an error indicates a locked device
 */
const isDeviceLockedError = (hwError: HardwareWalletError): boolean =>
  hwError.code === HardwareWalletErrorCode.DEVICE_LOCKED;

/**
 * Check if an error indicates the app is not open
 */
const isAppNotOpenError = (hwError: HardwareWalletError): boolean =>
  hwError.code === HardwareWalletErrorCode.APP_NOT_OPEN ||
  hwError.code === HardwareWalletErrorCode.APP_NOT_INSTALLED ||
  hwError.code === HardwareWalletErrorCode.FAILED_TO_OPEN_APP;

/**
 * Check if an error indicates disconnection
 */
const isDisconnectionError = (hwError: HardwareWalletError): boolean =>
  hwError.code === HardwareWalletErrorCode.DEVICE_DISCONNECTED ||
  hwError.code === HardwareWalletErrorCode.CONNECTION_FAILED ||
  hwError.code === HardwareWalletErrorCode.DEVICE_NOT_FOUND;

/**
 * Derive connection state from an error
 */
const getConnectionStateFromError = (
  hwError: HardwareWalletError,
): HardwareWalletConnectionState => {
  if (isDeviceLockedError(hwError)) {
    Logger.log(LOG_TAG, 'Error indicates device is locked');
    return ConnectionState.error('locked', hwError);
  }
  if (isAppNotOpenError(hwError)) {
    Logger.log(LOG_TAG, 'Error indicates app not open');
    return ConnectionState.awaitingApp('not_open');
  }
  if (isDisconnectionError(hwError)) {
    Logger.log(LOG_TAG, 'Error indicates disconnection');
    return ConnectionState.disconnected();
  }
  return ConnectionState.error('generic', hwError);
};

/**
 * Parse error based on wallet type
 */
const parseError = (
  err: unknown,
  type: HardwareWalletType,
): HardwareWalletError => {
  switch (type) {
    case HardwareWalletType.LEDGER:
      return parseLedgerError(err);
    case HardwareWalletType.TREZOR:
    case HardwareWalletType.QR:
    default:
      return createHardwareWalletError(
        HardwareWalletErrorCode.UNKNOWN_ERROR,
        type,
      );
  }
};

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
    // Add Trezor when supported
    default:
      return null;
  }
};

/**
 * No-op async function
 */
const noopAsync = async (): Promise<void> => {
  // No-op: Selected account is not a hardware wallet
};

/**
 * No-op sync function
 */
const noop = (): void => {
  // No-op: Selected account is not a hardware wallet
};

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
  // Get selected account from Redux
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  // Determine if selected account is a hardware wallet
  const keyringType = selectedAccount?.metadata?.keyring?.type;
  const detectedWalletType = keyringTypeToHardwareWalletType(keyringType);
  const isHardwareWalletAccount = detectedWalletType !== null;

  // State
  const [walletType, setWalletType] = useState<HardwareWalletType | null>(null);
  const [connectionState, setConnectionState] =
    useState<HardwareWalletConnectionState>(ConnectionState.disconnected());
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [bluetoothState, setBluetoothState] = useState<BluetoothState>(
    BluetoothState.UNKNOWN,
  );
  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState(false);
  const [currentAppName, setCurrentAppName] = useState<string | null>(null);

  // Refs
  const adapterRef = useRef<HardwareWalletAdapter | null>(null);
  const pendingOperationRef = useRef<(() => Promise<unknown>) | null>(null);
  const isMountedRef = useRef(true);
  const bluetoothSubscriptionRef = useRef<Unsubscribe | null>(null);
  // Ref to hold the connect function for use in effects and callbacks
  const connectRef = useRef<
    ((type: HardwareWalletType, id: string) => Promise<void>) | null
  >(null);
  // Guard to prevent multiple simultaneous connection attempts
  const isConnectingRef = useRef(false);

  /**
   * Handle device events from the adapter
   */
  const handleDeviceEvent = useCallback(
    (payload: DeviceEventPayload) => {
      if (!isMountedRef.current) return;

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
          } else if (connectionState.status === ConnectionStatus.AWAITING_APP) {
            // If we're back on Ethereum and were in AWAITING_APP, go to CONNECTED
            setConnectionState(ConnectionState.connected());
          }
          break;

        case DeviceEvent.BLUETOOTH_STATE_CHANGED:
          if (payload.bluetoothState) {
            setBluetoothState(payload.bluetoothState);
            setIsBluetoothAvailable(
              payload.bluetoothState === BluetoothState.POWERED_ON,
            );

            // If Bluetooth turned off while connected, show error
            if (
              payload.bluetoothState === BluetoothState.POWERED_OFF &&
              connectionState.status === ConnectionStatus.CONNECTED
            ) {
              const btError = createHardwareWalletError(
                HardwareWalletErrorCode.BLUETOOTH_OFF,
                walletType || HardwareWalletType.LEDGER,
              );
              setConnectionState(
                ConnectionState.error('bluetooth_off', btError),
              );
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
    },
    [connectionState.status, walletType],
  );

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      adapterRef.current?.destroy();
      bluetoothSubscriptionRef.current?.();
    };
  }, []);

  // Reset state when selected account changes to non-hardware wallet
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
    }
  }, [isHardwareWalletAccount]);

  /**
   * Handle adapter disconnect event
   */
  const handleDisconnect = useCallback(
    (disconnectError?: unknown) => {
      if (!isMountedRef.current) return;

      Logger.log(
        LOG_TAG,
        'Disconnect handler called',
        disconnectError,
        `isConnecting: ${isConnectingRef.current}`,
      );

      // If we're in the middle of a connection attempt, don't process disconnect
      // The connect function will handle errors
      if (isConnectingRef.current) {
        Logger.log(LOG_TAG, 'Ignoring disconnect during connection attempt');
        return;
      }

      adapterRef.current = null;
      isConnectingRef.current = false;

      // Parse the error if provided and set appropriate state
      if (disconnectError && walletType) {
        const hwError = parseError(disconnectError, walletType);
        setConnectionState(getConnectionStateFromError(hwError));
      } else {
        setConnectionState(ConnectionState.disconnected());
      }
    },
    [walletType],
  );

  /**
   * Connect to a hardware wallet
   */
  const connect = useCallback(
    async (type: HardwareWalletType, id: string): Promise<void> => {
      // No-op if not a hardware wallet account
      if (!isHardwareWalletAccount) return;
      if (!isMountedRef.current) return;

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

        // Create new adapter with callbacks
        const adapter = createAdapter(type, {
          onDisconnect: handleDisconnect,
          onAwaitingConfirmation: () => {
            if (isMountedRef.current) {
              setConnectionState(ConnectionState.awaitingConfirmation());
            }
          },
          onDeviceLocked: () => {
            if (isMountedRef.current) {
              Logger.log(LOG_TAG, 'Device locked detected');
              const lockedError = createHardwareWalletError(
                HardwareWalletErrorCode.DEVICE_LOCKED,
                type,
              );
              setConnectionState(ConnectionState.error('locked', lockedError));
            }
          },
          onAppNotOpen: () => {
            if (isMountedRef.current) {
              Logger.log(LOG_TAG, 'App not open detected');
              setConnectionState(ConnectionState.awaitingApp('not_open'));
            }
          },
          onBluetoothStateChange: (state, available) => {
            if (isMountedRef.current) {
              Logger.log(
                LOG_TAG,
                `Bluetooth state changed: ${state}, available: ${available}`,
              );
              setBluetoothState(state);
              setIsBluetoothAvailable(available);
            }
          },
          onPairingRemoved: (deviceName, productName) => {
            if (isMountedRef.current) {
              Logger.log(
                LOG_TAG,
                `Pairing removed for device: ${deviceName} (${productName})`,
              );
              const pairingError = createHardwareWalletError(
                HardwareWalletErrorCode.CONNECTION_FAILED,
                type,
              );
              setConnectionState(
                ConnectionState.error('pairing_removed', pairingError),
              );
            }
          },
          onDeviceEvent: handleDeviceEvent,
        });

        adapterRef.current = adapter;

        await adapter.connect(id);

        if (isMountedRef.current) {
          Logger.log(LOG_TAG, 'Connected successfully');
          setConnectionState(ConnectionState.connected());
          setCurrentAppName('Ethereum'); // We verified ETH app in connect
        }
        isConnectingRef.current = false;
      } catch (err) {
        Logger.log(LOG_TAG, 'Connection error', err);

        // Handle app switch scenario (Ledger)
        if (err instanceof AppSwitchRequiredError) {
          if (isMountedRef.current) {
            setConnectionState(ConnectionState.awaitingApp('not_open'));
          }

          // Wait for device to reconnect after app switch
          // Note: We keep isConnectingRef true during app switch to prevent duplicate attempts
          setTimeout(async () => {
            if (!isMountedRef.current) {
              isConnectingRef.current = false;
              return;
            }

            try {
              const currentAdapter = adapterRef.current;
              if (currentAdapter) {
                await currentAdapter.connect(id);
                if (isMountedRef.current) {
                  setConnectionState(ConnectionState.connected());
                }
              }
            } catch (reconnectErr) {
              if (reconnectErr instanceof AppSwitchRequiredError) {
                // Still waiting for app switch, don't reset connecting flag
                return;
              }
              if (isMountedRef.current) {
                const hwError = parseError(reconnectErr, type);
                setConnectionState(getConnectionStateFromError(hwError));
              }
            } finally {
              isConnectingRef.current = false;
            }
          }, RECONNECT_DELAY_MS);
          return;
        }

        if (isMountedRef.current) {
          const hwError = parseError(err, type);
          setConnectionState(getConnectionStateFromError(hwError));
        }
        adapterRef.current?.destroy();
        adapterRef.current = null;
        isConnectingRef.current = false;
      }
    },
    [handleDeviceEvent, handleDisconnect, isHardwareWalletAccount],
  );

  // Update connectRef when connect function changes
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

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
      if (isMountedRef.current) {
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
      // Throw if not a hardware wallet account
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

      // Store operation for potential retry
      pendingOperationRef.current = () => operation(adapter);

      try {
        if (isMountedRef.current) {
          setConnectionState(ConnectionState.awaitingConfirmation());
        }

        const result = await operation(adapter);

        if (isMountedRef.current) {
          setConnectionState(ConnectionState.connected());
        }
        pendingOperationRef.current = null;

        return result;
      } catch (err) {
        if (isMountedRef.current) {
          const hwError = parseError(err, currentWalletType);
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
    // No-op if not a hardware wallet account
    if (!isHardwareWalletAccount) return;
    if (!isMountedRef.current) return;

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
    // No-op if not a hardware wallet account
    if (!isHardwareWalletAccount) return;
    if (!isMountedRef.current) return;

    Logger.log(LOG_TAG, 'Retry requested');

    const currentWalletType = walletType;

    if (pendingOperationRef.current && adapterRef.current?.isConnected()) {
      try {
        if (isMountedRef.current) {
          setConnectionState(ConnectionState.awaitingConfirmation());
        }
        await pendingOperationRef.current();
        if (isMountedRef.current) {
          setConnectionState(ConnectionState.connected());
        }
        pendingOperationRef.current = null;
      } catch (err) {
        if (isMountedRef.current && currentWalletType) {
          const hwError = parseError(err, currentWalletType);
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
    if (!isHardwareWalletAccount) return false;

    const adapter = adapterRef.current;
    if (!adapter?.getCurrentAppName) {
      Logger.log(LOG_TAG, 'Adapter does not support getCurrentAppName');
      return false;
    }

    try {
      Logger.log(LOG_TAG, 'Verifying Ethereum app is open');
      const appName = await adapter.getCurrentAppName();

      if (isMountedRef.current) {
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
      if (isMountedRef.current && walletType) {
        const hwError = parseError(err, walletType);
        setConnectionState(getConnectionStateFromError(hwError));
      }
      return false;
    }
  }, [isHardwareWalletAccount, walletType]);

  // Memoize context value
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

  console.log('contextValue', contextValue);

  return (
    <HardwareWalletContext.Provider value={contextValue}>
      {children}
    </HardwareWalletContext.Provider>
  );
};

export default HardwareWalletProvider;
