import { HardwareWalletType } from './helpers';

/**
 * Device events emitted during hardware wallet operations.
 * Used by adapters to communicate state changes.
 */
export enum DeviceEvent {
  /** Device successfully connected */
  Connected = 'connected',
  /** Device disconnected (intentional or lost connection) */
  Disconnected = 'disconnected',
  /** Connection attempt failed */
  ConnectionFailed = 'connection_failed',
  /** Device is locked */
  DeviceLocked = 'device_locked',
  /** Correct app opened on device */
  AppOpened = 'app_opened',
  /** Wrong app is open, need to switch */
  AppClosed = 'app_closed',
  /** User needs to confirm action on device */
  ConfirmationRequired = 'confirmation_required',
  /** User confirmed action on device */
  ConfirmationReceived = 'confirmation_received',
  /** User rejected action on device */
  ConfirmationRejected = 'confirmation_rejected',
  /** Operation timed out */
  OperationTimeout = 'operation_timeout',
  /** Bluetooth permissions changed */
  PermissionChanged = 'permission_changed',
}

/**
 * Payload for device events with optional metadata
 */
export interface DeviceEventPayload {
  /** The type of event that occurred */
  event: DeviceEvent;
  /** Device ID if available */
  deviceId?: string;
  /** App name if relevant (e.g., 'Ethereum', 'Bitcoin') */
  appName?: string;
  /** Additional error information if applicable */
  error?: Error;
  /** Any additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating a hardware wallet adapter
 */
export interface HardwareWalletAdapterOptions {
  /** Called when device disconnects */
  onDisconnect: (error?: Error) => void;
  /** Called when device events occur */
  onDeviceEvent: (payload: DeviceEventPayload) => void;
}

/**
 * Interface that all hardware wallet adapters must implement.
 * Provides a unified API for different hardware wallet types.
 */
export interface HardwareWalletAdapter {
  /** The type of hardware wallet this adapter handles (null for non-hardware) */
  readonly walletType: HardwareWalletType | null;

  /**
   * Whether this adapter requires device discovery before connection.
   * Ledger: true (BLE scanning)
   * QR: true (camera scanning)
   * Non-hardware: false
   */
  readonly requiresDeviceDiscovery: boolean;

  /**
   * Connect to a hardware wallet device
   * @param deviceId - The device identifier (BLE ID for Ledger)
   */
  connect(deviceId: string): Promise<void>;

  /**
   * Disconnect from the current device
   */
  disconnect(): Promise<void>;

  /**
   * Get the currently connected device ID, if any
   */
  getConnectedDeviceId(): string | null;

  /**
   * Ensure the device is ready for operations.
   * This includes checking the correct app is open.
   * @param deviceId - The device identifier
   * @returns true if device is ready, false otherwise
   */
  ensureDeviceReady(deviceId: string): Promise<boolean>;

  /**
   * Check if a device is currently connected
   */
  isConnected(): boolean;

  /**
   * Reset the adapter state without emitting events.
   * Used when closing device selection to ensure clean state for next attempt.
   */
  reset(): void;

  /**
   * Mark the connection flow as complete.
   * After this is called, disconnect events will not trigger errors.
   * Used after success callback to prevent errors during account fetching.
   */
  markFlowComplete(): void;

  /**
   * Check if the connection flow is complete (success was shown).
   * Used to determine if errors should be suppressed.
   */
  isFlowComplete(): boolean;

  /**
   * Reset the flow state to allow errors to be shown again.
   * Should be called before starting new operations that may fail
   * (e.g., unlocking accounts after initial connection).
   */
  resetFlowState(): void;

  // ============ Device Discovery Methods ============

  /**
   * Start device discovery (BLE scan, camera, etc.)
   * This is adapter-specific - Ledger uses BLE, QR uses camera.
   *
   * @param onDeviceFound - Callback when a device is discovered
   * @param onError - Callback on discovery error
   * @returns Cleanup function to stop discovery
   */
  startDeviceDiscovery(
    onDeviceFound: (device: DiscoveredDevice) => void,
    onError: (error: Error) => void,
  ): () => void;

  /**
   * Stop device discovery
   */
  stopDeviceDiscovery(): void;

  /**
   * Check if the underlying transport mechanism is available.
   * For Ledger: Bluetooth is enabled
   * For QR: Camera permission granted
   * For Non-hardware: always true
   */
  isTransportAvailable(): Promise<boolean>;

  /**
   * Subscribe to transport availability changes (e.g., Bluetooth on/off).
   * The adapter will call the callback when transport state changes.
   *
   * @param callback - Called when transport state changes
   * @returns Cleanup function to unsubscribe
   */
  onTransportStateChange?(callback: (isAvailable: boolean) => void): () => void;

  /**
   * Get the required app name for this wallet type.
   * For Ledger: 'Ethereum'
   * For QR/others: undefined (no app concept)
   */
  getRequiredAppName?(): string | undefined;
}

/**
 * Bluetooth permission states for mobile
 */
export enum BluetoothPermissionState {
  /** Permission status is unknown (not yet requested) */
  Unknown = 'unknown',
  /** User granted Bluetooth permission */
  Granted = 'granted',
  /** User denied Bluetooth permission */
  Denied = 'denied',
  /** Bluetooth is not available on this device */
  Unavailable = 'unavailable',
}

/**
 * Location permission states (required for BLE on Android)
 */
export enum LocationPermissionState {
  /** Permission status is unknown (not yet requested) */
  Unknown = 'unknown',
  /** User granted location permission */
  Granted = 'granted',
  /** User denied location permission */
  Denied = 'denied',
  /** Location services are disabled */
  Disabled = 'disabled',
}

/**
 * Combined permission state for hardware wallet connections
 */
export interface HardwareWalletPermissions {
  /** Bluetooth permission state */
  bluetooth: BluetoothPermissionState;
  /** Location permission state (Android only, always 'granted' on iOS) */
  location: LocationPermissionState;
  /** Whether all required permissions are granted */
  allGranted: boolean;
}

/**
 * Generic discovered device (works for BLE, USB, etc.)
 * This is the wallet-type-agnostic device type used across the module.
 */
export interface DiscoveredDevice {
  /** Unique device identifier */
  id: string;
  /** Device name (e.g., 'Nano X 1234') */
  name: string;
  /** Device-specific metadata (rssi for BLE, etc.) */
  metadata?: Record<string, unknown>;
}

/**
 * Bluetooth device information from scanning
 * @deprecated Use DiscoveredDevice instead for wallet-type-agnostic code
 */
export interface BluetoothDevice {
  /** Unique device identifier */
  id: string;
  /** Device name (e.g., 'Nano X 1234') */
  name: string;
  /** Signal strength in dBm */
  rssi?: number;
  /** Whether this device was previously connected */
  isPreviouslyConnected?: boolean;
}

/**
 * Configuration for hardware wallet provider
 */
export interface HardwareWalletConfig {
  /** Whether the current account is a hardware wallet account */
  isHardwareWalletAccount: boolean;
  /** The type of hardware wallet, if applicable */
  walletType: HardwareWalletType | null;
  /** Device ID of the connected/associated device */
  deviceId: string | null;
  /** Whether Bluetooth is enabled on the device */
  isBluetoothEnabled: boolean;
  /** Current permission states */
  permissions: HardwareWalletPermissions;
}

/**
 * Actions available on the hardware wallet context
 */
export interface HardwareWalletActions {
  /**
   * Open the hardware wallet bottom sheet in device selection mode.
   * This triggers BLE scanning and shows the device selection UI.
   * @param walletType - The type of wallet to connect (e.g., Ledger)
   * @param onSuccess - Optional callback called after successful connection
   */
  openDeviceSelection: (
    walletType: HardwareWalletType,
    onSuccess?: () => void,
  ) => void;

  /**
   * Close the hardware wallet bottom sheet without connecting.
   * Stops BLE scanning and returns to disconnected state.
   */
  closeDeviceSelection: () => void;

  /**
   * Open the hardware wallet bottom sheet for signing operations.
   * Shows the signing UI (connecting → awaiting app → awaiting confirmation).
   * Used by confirmations flow when a hardware wallet signature is required.
   *
   * @param walletType - The type of wallet
   * @param deviceId - The device ID to connect to
   * @param onDeviceReady - Optional callback called when device is ready for signing.
   * This is where the actual signing logic should be triggered.
   */
  openSigningModal: (
    walletType: HardwareWalletType,
    deviceId: string,
    onDeviceReady?: () => Promise<void>,
  ) => Promise<void>;

  /**
   * Close the hardware wallet signing modal.
   * Cleans up signing state and hides the bottom sheet.
   */
  closeSigningModal: () => void;

  /**
   * Connect to a hardware wallet device
   * @param deviceId - The device identifier
   */
  connect: (deviceId: string) => Promise<void>;

  /**
   * Disconnect from the current device
   */
  disconnect: () => Promise<void>;

  /**
   * Ensure the device is ready for signing operations.
   *
   * This is a BLOCKING call that shows the bottom sheet if needed
   * and waits for the device to be ready or user to cancel.
   *
   * Wallet type is automatically derived from the current account's keyring type.
   * For "Add Hardware Wallet" flows, use `setTargetWalletType()` first.
   *
   * @param deviceId - Optional device ID. If not provided, for hardware accounts
   * shows device selection, for non-hardware accounts returns true immediately.
   * @returns true if device is ready, false if user cancelled
   */
  ensureDeviceReady: (deviceId?: string) => Promise<boolean>;

  /**
   * Set the target wallet type for "Add Hardware Wallet" flows.
   *
   * This is ONLY for flows where no account exists yet (user is adding a new
   * hardware wallet). For signing flows with existing accounts, the wallet type
   * is automatically derived from the account's keyring type.
   *
   * @param walletType - The wallet type being added
   */
  setTargetWalletType: (walletType: HardwareWalletType) => void;

  /**
   * Show a hardware wallet error in the bottom sheet.
   *
   * Always displays the error - no suppression. Use this for errors that occur
   * after ensureDeviceReady() succeeds (e.g., signing errors, transaction failures).
   *
   * Wallet type is auto-derived from the current account, so no need to pass it.
   *
   * @param error - The error to parse and display
   */
  showHardwareWalletError: (error: unknown) => void;

  /**
   * Clear any displayed error
   */
  clearError: () => void;

  /**
   * Retry the last failed operation
   */
  retry: () => Promise<void>;

  /**
   * Request Bluetooth permissions
   */
  requestBluetoothPermissions: () => Promise<boolean>;

  /**
   * Select a device from the discovered devices list.
   * Called when user taps on a device in the device selection UI.
   * @param device - The device to select
   */
  selectDevice: (device: DiscoveredDevice) => void;

  /**
   * Rescan for BLE devices.
   * Clears current device list and starts a new scan.
   */
  rescan: () => void;

  /**
   * Reset the flow state to allow errors to be shown again.
   * Should be called before starting new operations that may fail
   * (e.g., unlocking accounts after initial connection).
   */
  resetFlowState: () => void;

  /**
   * Show the "awaiting confirmation" bottom sheet.
   * Call this after ensureDeviceReady returns true, before sending
   * a signing request to the device. Shows UI prompting user to
   * confirm on their hardware wallet.
   * @param operationType - The type of operation (e.g., 'transaction', 'message')
   * @param onReject - Optional callback when user presses reject button
   */
  showAwaitingConfirmation: (
    operationType: 'transaction' | 'message',
    onReject?: () => void,
  ) => void;

  /**
   * Hide the "awaiting confirmation" bottom sheet.
   * Call this after the signing operation completes (success or error).
   */
  hideAwaitingConfirmation: () => void;
}

/**
 * Type guard: Check if an object is a DeviceEventPayload
 */
export const isDeviceEventPayload = (
  value: unknown,
): value is DeviceEventPayload =>
  typeof value === 'object' &&
  value !== null &&
  'event' in value &&
  Object.values(DeviceEvent).includes((value as DeviceEventPayload).event);

/**
 * Type guard: Check if permissions allow connection
 */
export const canAttemptConnection = (
  permissions: HardwareWalletPermissions,
): boolean =>
  permissions.bluetooth === BluetoothPermissionState.Granted &&
  permissions.location !== LocationPermissionState.Denied;
