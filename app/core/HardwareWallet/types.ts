import {
  HardwareWalletType,
  DeviceEventPayload,
} from '@metamask/hw-wallet-sdk';

/**
 * Options for creating a hardware wallet adapter
 */
export interface HardwareWalletAdapterOptions {
  /** Called when device disconnects */
  onDisconnect: (error?: Error) => void;
  /** Called when device event occurs */
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
 * Generic discovered device.
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
 * Device selection state for device discovery (BLE, camera, etc.)
 */
export interface DeviceSelectionState {
  /** List of discovered devices */
  devices: DiscoveredDevice[];
  /** Currently selected device (before connection) */
  selectedDevice: DiscoveredDevice | null;
  /** Whether device scanning is in progress */
  isScanning: boolean;
  /** Error during device scanning */
  scanError: Error | null;
}
