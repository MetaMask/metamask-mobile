/**
 * Hardware Wallet Types
 *
 * Common types and interfaces for all hardware wallet implementations.
 */

/**
 * Supported hardware wallet types
 */
export enum HardwareWalletType {
  LEDGER = 'ledger',
  TREZOR = 'trezor',
  QR = 'qr',
}

/**
 * Connection status values (for discriminated union)
 */
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  NEEDS_CONNECTION = 'needs_connection',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AWAITING_APP = 'awaiting_app',
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  ERROR = 'error',
}

/**
 * Reason why the device is awaiting app action
 */
export type AwaitingAppReason = 'not_open' | 'wrong_app';

/**
 * Reason for error state
 */
export type ErrorReason =
  | 'locked'
  | 'pairing_removed'
  | 'bluetooth_off'
  | 'connection_failed'
  | 'generic';

/**
 * Connection state for hardware wallets (discriminated union)
 */
export type HardwareWalletConnectionState =
  | { status: ConnectionStatus.DISCONNECTED }
  | { status: ConnectionStatus.NEEDS_CONNECTION }
  | { status: ConnectionStatus.CONNECTING }
  | { status: ConnectionStatus.CONNECTED }
  | { status: ConnectionStatus.AWAITING_CONFIRMATION }
  | {
      status: ConnectionStatus.AWAITING_APP;
      reason: AwaitingAppReason;
      currentAppName?: string;
    }
  | {
      status: ConnectionStatus.ERROR;
      reason: ErrorReason;
      error?: HardwareWalletError;
    };

/**
 * Helper to create connection states
 */
export const ConnectionState = {
  disconnected: (): HardwareWalletConnectionState => ({
    status: ConnectionStatus.DISCONNECTED,
  }),
  needsConnection: (): HardwareWalletConnectionState => ({
    status: ConnectionStatus.NEEDS_CONNECTION,
  }),
  connecting: (): HardwareWalletConnectionState => ({
    status: ConnectionStatus.CONNECTING,
  }),
  connected: (): HardwareWalletConnectionState => ({
    status: ConnectionStatus.CONNECTED,
  }),
  awaitingConfirmation: (): HardwareWalletConnectionState => ({
    status: ConnectionStatus.AWAITING_CONFIRMATION,
  }),
  awaitingApp: (
    reason: AwaitingAppReason,
    currentAppName?: string,
  ): HardwareWalletConnectionState => ({
    status: ConnectionStatus.AWAITING_APP,
    reason,
    currentAppName,
  }),
  error: (
    reason: ErrorReason,
    error?: HardwareWalletError,
  ): HardwareWalletConnectionState => ({
    status: ConnectionStatus.ERROR,
    reason,
    error,
  }),
} as const;

/**
 * Type guards for connection state
 */
export const isDisconnected = (
  state: HardwareWalletConnectionState,
): state is { status: ConnectionStatus.DISCONNECTED } =>
  state.status === ConnectionStatus.DISCONNECTED;

export const isConnecting = (
  state: HardwareWalletConnectionState,
): state is { status: ConnectionStatus.CONNECTING } =>
  state.status === ConnectionStatus.CONNECTING;

export const isConnected = (
  state: HardwareWalletConnectionState,
): state is { status: ConnectionStatus.CONNECTED } =>
  state.status === ConnectionStatus.CONNECTED;

export const isAwaitingApp = (
  state: HardwareWalletConnectionState,
): state is {
  status: ConnectionStatus.AWAITING_APP;
  reason: AwaitingAppReason;
  currentAppName?: string;
} => state.status === ConnectionStatus.AWAITING_APP;

export const isAwaitingConfirmation = (
  state: HardwareWalletConnectionState,
): state is { status: ConnectionStatus.AWAITING_CONFIRMATION } =>
  state.status === ConnectionStatus.AWAITING_CONFIRMATION;

export const isErrorState = (
  state: HardwareWalletConnectionState,
): state is {
  status: ConnectionStatus.ERROR;
  reason: ErrorReason;
  error?: HardwareWalletError;
} => state.status === ConnectionStatus.ERROR;

/**
 * Derived boolean helpers (for convenience/backwards compatibility)
 */
export const isDeviceLocked = (state: HardwareWalletConnectionState): boolean =>
  isErrorState(state) && state.reason === 'locked';

export const isPairingRemoved = (
  state: HardwareWalletConnectionState,
): boolean => isErrorState(state) && state.reason === 'pairing_removed';

export const isWrongApp = (state: HardwareWalletConnectionState): boolean =>
  isAwaitingApp(state) && state.reason === 'wrong_app';

export const isAppLaunchConfirmationNeeded = (
  state: HardwareWalletConnectionState,
): boolean => isAwaitingApp(state);

/**
 * Bluetooth adapter state
 */
export enum BluetoothState {
  UNKNOWN = 'Unknown',
  RESETTING = 'Resetting',
  UNSUPPORTED = 'Unsupported',
  UNAUTHORIZED = 'Unauthorized',
  POWERED_OFF = 'PoweredOff',
  POWERED_ON = 'PoweredOn',
}

/**
 * Device events emitted by hardware wallet adapters
 */
export enum DeviceEvent {
  /** Device was disconnected (intentionally or unexpectedly) */
  DISCONNECTED = 'disconnected',
  /** Device is locked and requires PIN entry */
  DEVICE_LOCKED = 'device_locked',
  /** Required app (e.g., Ethereum) is not open on device */
  APP_NOT_OPEN = 'app_not_open',
  /** App on the device has changed (e.g., user switched from Ethereum to another app) */
  APP_CHANGED = 'app_changed',
  /** Bluetooth adapter state changed */
  BLUETOOTH_STATE_CHANGED = 'bluetooth_state_changed',
  /** Device pairing was removed (iOS specific) */
  PAIRING_REMOVED = 'pairing_removed',
  /** Connection attempt failed */
  CONNECTION_FAILED = 'connection_failed',
  /** Operation timed out waiting for user confirmation */
  OPERATION_TIMEOUT = 'operation_timeout',
}

/**
 * Payload for device events
 */
export interface DeviceEventPayload {
  event: DeviceEvent;
  error?: HardwareWalletError;
  bluetoothState?: BluetoothState;
  /** Original error from the transport layer */
  originalError?: unknown;
  /** Current app name on the device (for APP_CHANGED events) */
  currentAppName?: string;
  /** Previous app name on the device (for APP_CHANGED events) */
  previousAppName?: string;
}

/**
 * Error codes common to all hardware wallets
 */
export enum HardwareWalletErrorCode {
  // Connection errors
  DEVICE_DISCONNECTED = 'DEVICE_DISCONNECTED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',

  // Bluetooth/Permission errors
  BLUETOOTH_OFF = 'BLUETOOTH_OFF',
  BLUETOOTH_PERMISSION_DENIED = 'BLUETOOTH_PERMISSION_DENIED',
  LOCATION_PERMISSION_DENIED = 'LOCATION_PERMISSION_DENIED',
  NEARBY_DEVICES_PERMISSION_DENIED = 'NEARBY_DEVICES_PERMISSION_DENIED',

  // App errors
  APP_NOT_INSTALLED = 'APP_NOT_INSTALLED',
  APP_NOT_OPEN = 'APP_NOT_OPEN',
  FAILED_TO_OPEN_APP = 'FAILED_TO_OPEN_APP',
  FAILED_TO_CLOSE_APP = 'FAILED_TO_CLOSE_APP',

  // User action errors
  USER_REJECTED = 'USER_REJECTED',
  DEVICE_LOCKED = 'DEVICE_LOCKED',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',

  // Signing errors
  BLIND_SIGNING_DISABLED = 'BLIND_SIGNING_DISABLED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NONCE_TOO_LOW = 'NONCE_TOO_LOW',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Structured error for hardware wallet operations
 */
export interface HardwareWalletError {
  code: HardwareWalletErrorCode;
  walletType: HardwareWalletType;
  title: string;
  subtitle: string;
  isRetryable: boolean;
  showSettings: boolean;
}

/**
 * Account returned from hardware wallet
 */
export interface HardwareWalletAccount {
  address: string;
  index: number;
  balance: string;
}

/**
 * Common interface all wallet adapters must implement
 */
export interface HardwareWalletAdapter {
  /**
   * The type of hardware wallet this adapter handles
   */
  readonly type: HardwareWalletType;

  /**
   * Connect to the hardware wallet device
   * @param deviceId - The device identifier (Bluetooth ID, USB path, etc.)
   */
  connect(deviceId: string): Promise<void>;

  /**
   * Disconnect from the hardware wallet device
   */
  disconnect(): Promise<void>;

  /**
   * Check if the device is currently connected
   */
  isConnected(): boolean;

  /**
   * Get the current device ID
   */
  getDeviceId(): string | null;

  /**
   * Set the HD derivation path
   * @param path - The HD path (e.g., "m/44'/60'/0'/0")
   */
  setHDPath(path: string): Promise<void>;

  /**
   * Get accounts from the hardware wallet
   * @param page - Page number for pagination
   */
  getAccounts(page: number): Promise<HardwareWalletAccount[]>;

  /**
   * Unlock/add an account at the specified index
   * @param index - The account index to unlock
   */
  unlockAccount(index: number): Promise<string>;

  /**
   * Forget/remove the device
   */
  forgetDevice(): Promise<void>;

  /**
   * Clean up resources when the adapter is no longer needed
   */
  destroy(): void;

  /**
   * Subscribe to Bluetooth state changes
   * @returns Unsubscribe function
   */
  subscribeToBluetoothState?(): Unsubscribe;

  /**
   * Get the current Bluetooth state
   */
  getBluetoothState?(): Promise<BluetoothState>;

  /**
   * Get the name of the currently open app on the device
   * @returns The app name (e.g., "Ethereum", "BOLOS" for main menu)
   */
  getCurrentAppName?(): Promise<string>;

  /**
   * Start periodic health checks to detect silent disconnections
   * Health checks poll the device to verify the connection is still active
   */
  startHealthCheck?(): void;

  /**
   * Stop periodic health checks
   */
  stopHealthCheck?(): void;

  /**
   * Mark that a user-interactive operation is pending.
   * Used to prevent health checks from interfering with signing operations.
   */
  setPendingOperation?(pending: boolean): void;
}

/**
 * Subscription unsubscribe function
 */
export type Unsubscribe = () => void;

/**
 * Options for creating a hardware wallet adapter
 */
export interface HardwareWalletAdapterOptions {
  /**
   * Callback when the device disconnects unexpectedly
   */
  onDisconnect?: (error?: unknown) => void;

  /**
   * Callback when waiting for user confirmation on device
   */
  onAwaitingConfirmation?: () => void;

  /**
   * Callback when the device is locked
   */
  onDeviceLocked?: () => void;

  /**
   * Callback when the required app is not open
   */
  onAppNotOpen?: () => void;

  /**
   * Callback when Bluetooth state changes
   */
  onBluetoothStateChange?: (state: BluetoothState, available: boolean) => void;

  /**
   * Callback for generic device events (alternative to individual callbacks)
   */
  onDeviceEvent?: (payload: DeviceEventPayload) => void;

  /**
   * Callback when iOS pairing is removed (requires re-pairing in Settings)
   */
  onPairingRemoved?: (deviceName?: string, productName?: string) => void;
}

/**
 * Context value type for the HardwareWalletContext
 */
export interface HardwareWalletContextType {
  // State
  /** Whether the currently selected account is a hardware wallet account */
  isHardwareWalletAccount: boolean;
  /** Hardware wallet type detected from the selected account's keyring */
  detectedWalletType: HardwareWalletType | null;
  /** Currently active wallet type (set during connection) */
  walletType: HardwareWalletType | null;
  /** Connection state (discriminated union with status and reason) */
  connectionState: HardwareWalletConnectionState;
  /** Device ID of the connected/connecting device */
  deviceId: string | null;
  /** Current Bluetooth adapter state */
  bluetoothState: BluetoothState;
  /** Whether Bluetooth is available and powered on */
  isBluetoothAvailable: boolean;
  /** Name of the currently open app on the device (e.g., "Ethereum", "BOLOS") */
  currentAppName: string | null;

  // Actions
  connect: (type: HardwareWalletType, deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  executeWithWallet: <T>(
    operation: (adapter: HardwareWalletAdapter) => Promise<T>,
  ) => Promise<T>;
  clearError: () => void;
  retry: () => Promise<void>;
  /** Start observing Bluetooth state changes */
  startBluetoothStateObservation: () => void;
  /** Stop observing Bluetooth state changes */
  stopBluetoothStateObservation: () => void;
  /** Verify the Ethereum app is still open and update state */
  verifyEthereumApp: () => Promise<boolean>;
}

// ============================================================================
// QR Hardware Wallet Types
// ============================================================================

/**
 * QR signing flow status values (for discriminated union)
 */
export enum QRSigningStatus {
  /** No signing operation in progress */
  IDLE = 'idle',
  /** Awaiting user to scan the QR code displayed on their hardware wallet */
  AWAITING_SCAN = 'awaiting_scan',
  /** Camera is active and scanning */
  SCANNING = 'scanning',
  /** Scan completed successfully, processing signature */
  PROCESSING = 'processing',
  /** Signing request was completed */
  COMPLETED = 'completed',
  /** An error occurred during the signing flow */
  ERROR = 'error',
  /** Awaiting camera permission */
  NEEDS_CAMERA_PERMISSION = 'needs_camera_permission',
}

/**
 * QR scan request type
 */
export type QRScanRequestType = 'sign' | 'sync';

/**
 * Camera permission status
 */
export enum CameraPermissionStatus {
  UNKNOWN = 'unknown',
  GRANTED = 'granted',
  DENIED = 'denied',
}

/**
 * QR signing state (discriminated union)
 */
export type QRSigningState =
  | { status: QRSigningStatus.IDLE }
  | {
      status: QRSigningStatus.AWAITING_SCAN;
      requestType: QRScanRequestType;
      requestData?: unknown;
    }
  | {
      status: QRSigningStatus.SCANNING;
      requestType: QRScanRequestType;
    }
  | {
      status: QRSigningStatus.PROCESSING;
    }
  | {
      status: QRSigningStatus.COMPLETED;
    }
  | {
      status: QRSigningStatus.ERROR;
      error: QRHardwareError;
    }
  | {
      status: QRSigningStatus.NEEDS_CAMERA_PERMISSION;
    };

/**
 * Helper to create QR signing states
 */
export const QRSigningState = {
  idle: (): QRSigningState => ({
    status: QRSigningStatus.IDLE,
  }),
  awaitingScan: (
    requestType: QRScanRequestType,
    requestData?: unknown,
  ): QRSigningState => ({
    status: QRSigningStatus.AWAITING_SCAN,
    requestType,
    requestData,
  }),
  scanning: (requestType: QRScanRequestType): QRSigningState => ({
    status: QRSigningStatus.SCANNING,
    requestType,
  }),
  processing: (): QRSigningState => ({
    status: QRSigningStatus.PROCESSING,
  }),
  completed: (): QRSigningState => ({
    status: QRSigningStatus.COMPLETED,
  }),
  error: (error: QRHardwareError): QRSigningState => ({
    status: QRSigningStatus.ERROR,
    error,
  }),
  needsCameraPermission: (): QRSigningState => ({
    status: QRSigningStatus.NEEDS_CAMERA_PERMISSION,
  }),
} as const;

/**
 * Type guards for QR signing state
 */
export const isQRIdle = (
  state: QRSigningState,
): state is { status: QRSigningStatus.IDLE } =>
  state.status === QRSigningStatus.IDLE;

export const isQRAwaitingScan = (
  state: QRSigningState,
): state is {
  status: QRSigningStatus.AWAITING_SCAN;
  requestType: QRScanRequestType;
  requestData?: unknown;
} => state.status === QRSigningStatus.AWAITING_SCAN;

export const isQRScanning = (
  state: QRSigningState,
): state is {
  status: QRSigningStatus.SCANNING;
  requestType: QRScanRequestType;
} => state.status === QRSigningStatus.SCANNING;

export const isQRProcessing = (
  state: QRSigningState,
): state is { status: QRSigningStatus.PROCESSING } =>
  state.status === QRSigningStatus.PROCESSING;

export const isQRCompleted = (
  state: QRSigningState,
): state is { status: QRSigningStatus.COMPLETED } =>
  state.status === QRSigningStatus.COMPLETED;

export const isQRError = (
  state: QRSigningState,
): state is {
  status: QRSigningStatus.ERROR;
  error: QRHardwareError;
} => state.status === QRSigningStatus.ERROR;

export const isQRNeedsCameraPermission = (
  state: QRSigningState,
): state is { status: QRSigningStatus.NEEDS_CAMERA_PERMISSION } =>
  state.status === QRSigningStatus.NEEDS_CAMERA_PERMISSION;

/**
 * QR Hardware wallet error codes
 */
export enum QRHardwareErrorCode {
  CAMERA_PERMISSION_DENIED = 'CAMERA_PERMISSION_DENIED',
  INVALID_QR_CODE = 'INVALID_QR_CODE',
  SCAN_CANCELLED = 'SCAN_CANCELLED',
  SCAN_TIMEOUT = 'SCAN_TIMEOUT',
  DEVICE_NOT_SUPPORTED = 'DEVICE_NOT_SUPPORTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * QR Hardware error
 */
export interface QRHardwareError {
  code: QRHardwareErrorCode;
  title: string;
  subtitle: string;
  isRetryable: boolean;
}

/**
 * QR Hardware wallet adapter options
 */
export interface QRHardwareAdapterOptions {
  /**
   * Callback when a scan request is initiated
   */
  onScanRequested?: (
    requestType: QRScanRequestType,
    requestData?: unknown,
  ) => void;

  /**
   * Callback when scan is completed
   */
  onScanCompleted?: () => void;

  /**
   * Callback when scan is cancelled or rejected
   */
  onScanRejected?: (error: Error) => void;

  /**
   * Callback when camera permission is needed
   */
  onCameraPermissionNeeded?: () => void;

  /**
   * Callback when camera permission is granted
   */
  onCameraPermissionGranted?: () => void;

  /**
   * Callback when camera permission is denied
   */
  onCameraPermissionDenied?: () => void;
}

/**
 * QR Hardware wallet context type (discriminated union for return type)
 */
export type QRHardwareContextType =
  | QRHardwareContextIdle
  | QRHardwareContextSigning
  | QRHardwareContextError;

/**
 * Base properties shared by all QR context states
 */
interface QRHardwareContextBase {
  /** Whether the currently selected account is a QR hardware wallet account */
  isQRHardwareAccount: boolean;
  /** Camera permission status */
  cameraPermission: CameraPermissionStatus;
  /** Camera error message if any */
  cameraError: string | undefined;
}

/**
 * QR context when idle (no signing operation)
 */
export interface QRHardwareContextIdle extends QRHardwareContextBase {
  signingState: { status: QRSigningStatus.IDLE };
  /** Cancel is a no-op when idle */
  cancelScanRequest: () => void;
  /** Scanner visibility control */
  scannerVisible: false;
  setScannerVisible: (visible: boolean) => void;
  /** Mark request as completed (no-op when idle) */
  setRequestCompleted: () => void;
}

/**
 * QR context when signing (scan in progress)
 */
export interface QRHardwareContextSigning extends QRHardwareContextBase {
  signingState:
    | {
        status: QRSigningStatus.AWAITING_SCAN;
        requestType: QRScanRequestType;
        requestData?: unknown;
      }
    | {
        status: QRSigningStatus.SCANNING;
        requestType: QRScanRequestType;
      }
    | { status: QRSigningStatus.PROCESSING }
    | { status: QRSigningStatus.COMPLETED }
    | { status: QRSigningStatus.NEEDS_CAMERA_PERMISSION };
  /** Cancel the current scan request */
  cancelScanRequest: () => Promise<void>;
  /** Whether the scanner view is visible */
  scannerVisible: boolean;
  setScannerVisible: (visible: boolean) => void;
  /** Mark the current request as completed */
  setRequestCompleted: () => void;
}

/**
 * QR context when in error state
 */
export interface QRHardwareContextError extends QRHardwareContextBase {
  signingState: {
    status: QRSigningStatus.ERROR;
    error: QRHardwareError;
  };
  /** Clear error and return to idle */
  cancelScanRequest: () => void;
  scannerVisible: boolean;
  setScannerVisible: (visible: boolean) => void;
  setRequestCompleted: () => void;
}
