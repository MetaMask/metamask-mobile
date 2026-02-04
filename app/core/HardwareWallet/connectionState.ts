import { HardwareWalletError } from '@metamask/hw-wallet-sdk';

/**
 * Connection status enum for hardware wallet state machine.
 * Matches Extension PR #39038 architecture.
 */
export enum ConnectionStatus {
  /** No device connected */
  Disconnected = 'disconnected',
  /** Scanning for Bluetooth devices (bottom sheet open with device selection) */
  Scanning = 'scanning',
  /** Attempting to establish BLE connection */
  Connecting = 'connecting',
  /** BLE connected, transport established */
  Connected = 'connected',
  /** Waiting for user to open the correct app on device */
  AwaitingApp = 'awaiting_app',
  /** Waiting for user to confirm action on device */
  AwaitingConfirmation = 'awaiting_confirmation',
  /** An error occurred */
  ErrorState = 'error',
  /** Operation completed successfully */
  Success = 'success',
}

/**
 * Discriminated union type for hardware wallet connection state.
 * Each status has its own shape with relevant data.
 */
export type HardwareWalletConnectionState =
  | { status: ConnectionStatus.Disconnected }
  | { status: ConnectionStatus.Scanning }
  | { status: ConnectionStatus.Connecting; deviceId?: string }
  | { status: ConnectionStatus.Connected; deviceId: string }
  | {
      status: ConnectionStatus.AwaitingApp;
      deviceId: string;
      requiredApp?: string;
    }
  | {
      status: ConnectionStatus.AwaitingConfirmation;
      deviceId: string;
      operationType?: string;
    }
  | { status: ConnectionStatus.ErrorState; error: HardwareWalletError }
  | { status: ConnectionStatus.Success; deviceId?: string };

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
   * @param requiredApp - The app that needs to be opened (e.g., 'Ethereum')
   */
  awaitingApp: (
    deviceId: string,
    requiredApp?: string,
  ): HardwareWalletConnectionState => ({
    status: ConnectionStatus.AwaitingApp,
    deviceId,
    requiredApp,
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
    status: ConnectionStatus.Success,
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
