import {
  HardwareWalletError,
  ConnectionStatus,
  HardwareWalletConnectionState,
} from '@metamask/hw-wallet-sdk';

/**
 * Factory functions for creating connection states.
 * Provides type-safe state creation with sensible defaults.
 */
export const ConnectionState = {
  /**
   * Create a disconnected state
   */
  disconnected: (): HardwareWalletConnectionState => ({
    status: ConnectionStatus.Disconnected,
  }),

  /**
   * Create a scanning state (device selection UI open)
   */
  scanning: (): HardwareWalletConnectionState => ({
    status: ConnectionStatus.Scanning,
  }),

  /**
   * Create a connecting state
   * @param deviceId - Optional device ID if known during connection
   */
  connecting: (deviceId?: string): HardwareWalletConnectionState => ({
    status: ConnectionStatus.Connecting,
    deviceId,
  }),

  /**
   * Create a connected state
   * @param deviceId - The connected device's ID
   */
  connected: (deviceId: string): HardwareWalletConnectionState => ({
    status: ConnectionStatus.Connected,
    deviceId,
  }),

  /**
   * Create an awaiting app state
   * @param deviceId - The connected device's ID
   * @param appName - The app that needs to be opened (e.g., 'Ethereum')
   */
  awaitingApp: (
    deviceId: string,
    appName?: string,
  ): HardwareWalletConnectionState => ({
    status: ConnectionStatus.AwaitingApp,
    deviceId,
    appName,
  }),

  /**
   * Create an awaiting confirmation state
   * @param deviceId - The connected device's ID
   * @param operationType - The type of operation awaiting confirmation
   */
  awaitingConfirmation: (
    deviceId: string,
    operationType?: string,
  ): HardwareWalletConnectionState => ({
    status: ConnectionStatus.AwaitingConfirmation,
    deviceId,
    operationType,
  }),

  /**
   * Create an error state
   * @param error - The HardwareWalletError that occurred
   */
  error: (error: HardwareWalletError): HardwareWalletConnectionState => ({
    status: ConnectionStatus.ErrorState,
    error,
  }),

  /**
   * Create a success state
   * @param deviceId - Optional device ID that was successfully connected
   */
  success: (deviceId?: string): HardwareWalletConnectionState => ({
    status: ConnectionStatus.Ready,
    deviceId,
  }),
};

/**
 * Type guard to check if state is in an error state
 */
export const isErrorState = (
  state: HardwareWalletConnectionState,
): state is {
  status: ConnectionStatus.ErrorState;
  error: HardwareWalletError;
} => state.status === ConnectionStatus.ErrorState;

/**
 * Type guard to check if state has a device ID
 */
export const hasDeviceId = (
  state: HardwareWalletConnectionState,
): state is HardwareWalletConnectionState & { deviceId: string } =>
  'deviceId' in state && typeof state.deviceId === 'string';

/**
 * Type guard to check if device is connected (Connected, AwaitingApp, or AwaitingConfirmation)
 */
export const isDeviceConnected = (
  state: HardwareWalletConnectionState,
): boolean =>
  state.status === ConnectionStatus.Connected ||
  state.status === ConnectionStatus.AwaitingApp ||
  state.status === ConnectionStatus.AwaitingConfirmation;

/**
 * Type guard to check if device is busy (connecting, awaiting app, or awaiting confirmation)
 */
export const isDeviceBusy = (state: HardwareWalletConnectionState): boolean =>
  state.status === ConnectionStatus.Connecting ||
  state.status === ConnectionStatus.AwaitingApp ||
  state.status === ConnectionStatus.AwaitingConfirmation;
