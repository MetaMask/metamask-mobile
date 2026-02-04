/* eslint-disable no-console */
import TransportBLE, {
  default as BleTransport,
} from '@ledgerhq/react-native-hw-transport-ble';
import { State as BleState } from 'react-native-ble-plx';
import { Observable, Subscription } from 'rxjs';
import Eth from '@ledgerhq/hw-app-eth';
import { HardwareWalletType } from '../helpers';
import {
  DeviceEvent,
  DeviceEventPayload,
  DiscoveredDevice,
  HardwareWalletAdapter,
  HardwareWalletAdapterOptions,
} from '../types';
import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../Ledger/Ledger';

/**
 * Status codes returned by Ledger devices
 */
const DEVICE_LOCKED_STATUS_CODE = 0x6b0c;

/**
 * Default timeout for Ledger operations (ms)
 * Primary lock detection is via status codes, but BLE can sometimes hang
 */
const LEDGER_OPERATION_TIMEOUT_MS = 10000;

/**
 * Maximum number of connection restart attempts
 */
const RESTART_LIMIT = 5;

/**
 * Adapter for Ledger hardware wallets using Bluetooth Low Energy (BLE).
 *
 * This adapter encapsulates all BLE transport logic for communicating with
 * Ledger devices. It implements the HardwareWalletAdapter interface to provide
 * a unified API for the hardware wallet context.
 */
/**
 * Default scan timeout (ms)
 */
const DEFAULT_SCAN_TIMEOUT_MS = 30000;

export class LedgerBluetoothAdapter implements HardwareWalletAdapter {
  readonly walletType = HardwareWalletType.Ledger;
  readonly requiresDeviceDiscovery = true;

  private transport: BleTransport | null = null;
  private deviceId: string | null = null;
  private options: HardwareWalletAdapterOptions;
  private restartCount = 0;
  private isDestroyed = false;
  /**
   * Flag to indicate the connection flow has completed successfully.
   * When true, disconnect events should NOT emit DeviceEvent.Disconnected or errors
   * because the user has already moved on to account selection.
   */
  private flowComplete = false;

  // ============ BLE State Management ============
  /** Current Bluetooth enabled state */
  private isBluetoothOn = false;
  /** Subscription for BLE state monitoring (Ledger returns its own subscription type) */
  private bleStateSubscription: { unsubscribe: () => void } | null = null;
  /** Subscription for BLE device scanning */
  private scanSubscription: Subscription | null = null;
  /** Timeout for scan operation */
  private scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Callbacks for transport state changes */
  private transportStateCallbacks: Set<(isAvailable: boolean) => void> =
    new Set();

  constructor(options: HardwareWalletAdapterOptions) {
    this.options = options;
    // Start monitoring Bluetooth state immediately
    this.startBluetoothMonitoring();
  }

  /**
   * Connect to a Ledger device via Bluetooth
   */
  async connect(deviceId: string): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }

    if (this.transport && this.deviceId === deviceId) {
      // Already connected to this device
      return;
    }

    // Disconnect from any existing connection
    if (this.transport) {
      await this.disconnect();
    }

    try {
      this.transport = await TransportBLE.open(deviceId);
      this.deviceId = deviceId;
      this.restartCount = 0;

      // Set up disconnect handler
      this.transport?.on('disconnect', () => {
        this.handleDisconnect();
      });

      // Set up error handler to catch BLE errors after disconnect
      // This prevents unhandled errors from crashing the app
      this.transport?.on('error', (error: Error) => {
        console.log('[LedgerBluetoothAdapter] Transport error:', error.message);
        // If flow is complete, ignore the error (it's expected after disconnect)
        if (this.flowComplete) {
          console.log(
            '[LedgerBluetoothAdapter] Flow complete - ignoring transport error',
          );
          return;
        }
        // Otherwise, handle it as a disconnect
        this.handleDisconnect();
      });

      this.emitEvent({
        event: DeviceEvent.Connected,
        deviceId,
      });
    } catch (error) {
      this.transport = null;
      this.deviceId = null;

      this.emitEvent({
        event: DeviceEvent.ConnectionFailed,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      throw error;
    }
  }

  /**
   * Disconnect from the current Ledger device
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // Ignore close errors
      }
    }

    const previousDeviceId = this.deviceId;
    this.transport = null;
    this.deviceId = null;
    this.restartCount = 0;

    if (previousDeviceId) {
      this.emitEvent({
        event: DeviceEvent.Disconnected,
        deviceId: previousDeviceId,
      });
    }
  }

  /**
   * Reset the adapter state without emitting events.
   * Used when closing device selection to ensure clean state for next attempt.
   */
  reset(): void {
    console.log('[LedgerBluetoothAdapter] Resetting adapter state');
    this.flowComplete = false;
    this.restartCount = 0;

    if (this.transport) {
      try {
        this.transport.close();
      } catch {
        // Ignore close errors
      }
    }

    this.transport = null;
    this.deviceId = null;
  }

  /**
   * Mark the connection flow as complete.
   * After this is called, disconnect events will not trigger errors.
   * Used after success callback to prevent errors during account fetching.
   */
  markFlowComplete(): void {
    console.log('[LedgerBluetoothAdapter] Marking flow as complete');
    this.flowComplete = true;
  }

  /**
   * Check if the connection flow is complete (success was shown).
   * Used to determine if errors should be suppressed.
   */
  isFlowComplete(): boolean {
    return this.flowComplete;
  }

  /**
   * Reset the flow state to allow errors to be shown again.
   * Should be called before starting new operations that may fail.
   */
  resetFlowState(): void {
    console.log('[LedgerBluetoothAdapter] Resetting flow state');
    this.flowComplete = false;
  }

  /**
   * Get the ID of the currently connected device
   */
  getConnectedDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Check if connected to a device
   */
  isConnected(): boolean {
    return this.transport !== null;
  }

  // ============ Device Discovery Methods ============

  /**
   * Start scanning for BLE devices.
   * Implements the HardwareWalletAdapter interface.
   *
   * @param onDeviceFound - Callback when a device is discovered
   * @param onError - Callback on discovery error
   * @returns Cleanup function to stop discovery
   */
  startDeviceDiscovery(
    onDeviceFound: (device: DiscoveredDevice) => void,
    onError: (error: Error) => void,
  ): () => void {
    console.log('[LedgerBluetoothAdapter] startDeviceDiscovery called');

    // Note: We don't check isBluetoothOn here because:
    // 1. The BLE state observer is async - it may not have fired yet
    // 2. TransportBLE.listen will fail naturally if BLE is unavailable
    // 3. Checking too early causes race conditions on startup

    // Stop any existing scan
    this.stopDeviceDiscovery();

    const seenDevices = new Set<string>();

    console.log('[LedgerBluetoothAdapter] Starting TransportBLE.listen');

    this.scanSubscription = new Observable(TransportBLE.listen).subscribe({
      next: (event: {
        type: string;
        descriptor: { id: string; name: string };
      }) => {
        console.log(
          '[LedgerBluetoothAdapter] BLE event:',
          event.type,
          event.descriptor?.name,
          event.descriptor?.id,
        );
        if (event.type === 'add' && !seenDevices.has(event.descriptor.id)) {
          seenDevices.add(event.descriptor.id);
          const discoveredDev: DiscoveredDevice = {
            id: event.descriptor.id,
            name: event.descriptor.name || 'Unknown Device',
          };
          console.log(
            '[LedgerBluetoothAdapter] Found device:',
            discoveredDev.name,
          );
          onDeviceFound(discoveredDev);
        }
      },
      error: (error: Error) => {
        console.error('[LedgerBluetoothAdapter] BLE scan error:', error);
        onError(error);
      },
      complete: () => {
        console.log('[LedgerBluetoothAdapter] BLE scan completed');
      },
    });

    // Set scan timeout
    this.scanTimeoutId = setTimeout(() => {
      console.log('[LedgerBluetoothAdapter] Scan timeout reached');
      this.stopDeviceDiscovery();
      if (seenDevices.size === 0) {
        onError(
          new Error(
            'Scan timeout: No Ledger devices found. Make sure your Ledger is unlocked and Bluetooth is enabled on the device.',
          ),
        );
      }
    }, DEFAULT_SCAN_TIMEOUT_MS);

    return () => this.stopDeviceDiscovery();
  }

  /**
   * Stop scanning for devices
   */
  stopDeviceDiscovery(): void {
    console.log('[LedgerBluetoothAdapter] stopDeviceDiscovery called');

    if (this.scanSubscription) {
      this.scanSubscription.unsubscribe();
      this.scanSubscription = null;
    }

    if (this.scanTimeoutId) {
      clearTimeout(this.scanTimeoutId);
      this.scanTimeoutId = null;
    }
  }

  /**
   * Check if Bluetooth is available
   */
  async isTransportAvailable(): Promise<boolean> {
    return this.isBluetoothOn;
  }

  /**
   * Subscribe to Bluetooth state changes.
   * The callback will be called immediately with the current state,
   * then whenever Bluetooth is enabled/disabled.
   *
   * @param callback - Called when Bluetooth state changes
   * @returns Cleanup function to unsubscribe
   */
  onTransportStateChange(callback: (isAvailable: boolean) => void): () => void {
    // Add to callbacks set
    this.transportStateCallbacks.add(callback);

    // Immediately notify of current state
    callback(this.isBluetoothOn);

    // Return cleanup function
    return () => {
      this.transportStateCallbacks.delete(callback);
    };
  }

  /**
   * Get the required app name for Ledger
   */
  getRequiredAppName(): string {
    return 'Ethereum';
  }

  /**
   * Ensure the device is ready for operations.
   *
   * This method:
   * 1. Connects to the device if not already connected
   * 2. Checks if the Ethereum app is open
   * 3. If not open, emits AppClosed event and returns false
   * 4. If open, verifies device is unlocked
   *
   * Handles transient disconnects (e.g., during app switch) by retrying.
   *
   * @param deviceId - The device ID to connect to
   * @returns true if device is ready, false otherwise
   */
  async ensureDeviceReady(deviceId: string): Promise<boolean> {
    console.log(
      '[LedgerBluetoothAdapter] ensureDeviceReady called for:',
      deviceId,
    );

    // Retry on transient disconnects (e.g., device switching apps)
    const MAX_DISCONNECT_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    for (let attempt = 1; attempt <= MAX_DISCONNECT_RETRIES; attempt++) {
      try {
        return await this.doEnsureDeviceReady(deviceId);
      } catch (error) {
        const isDisconnect =
          error instanceof Error &&
          (error.name === 'DisconnectedDevice' ||
            error.name === 'DisconnectedDeviceDuringOperation');

        if (isDisconnect && attempt < MAX_DISCONNECT_RETRIES) {
          console.log(
            `[LedgerBluetoothAdapter] Disconnect during check (attempt ${attempt}/${MAX_DISCONNECT_RETRIES}), retrying...`,
          );
          // Wait for reconnect to settle
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          // Clear transport to force reconnect on next attempt
          this.transport = null;
          continue;
        }

        // Non-disconnect error or max retries reached
        throw error;
      }
    }

    // Should not reach here, but TypeScript needs a return
    return false;
  }

  /**
   * Internal implementation of device readiness check.
   * Separated to allow retry wrapper in ensureDeviceReady.
   */
  private async doEnsureDeviceReady(deviceId: string): Promise<boolean> {
    // Connect if needed
    if (!this.isConnected() || this.deviceId !== deviceId) {
      console.log('[LedgerBluetoothAdapter] Connecting first...');
      await this.connect(deviceId);
    }

    if (!this.transport) {
      console.log('[LedgerBluetoothAdapter] No transport after connect');
      return false;
    }

    try {
      // Check which app is open
      console.log('[LedgerBluetoothAdapter] Checking app...');
      const appName = await this.withTimeout(
        connectLedgerHardware(this.transport, deviceId),
        LEDGER_OPERATION_TIMEOUT_MS,
        'Device unresponsive',
      );
      console.log('[LedgerBluetoothAdapter] Got app name:', appName);

      if (appName === 'Ethereum') {
        // Correct app is open - verify device is unlocked
        console.log(
          '[LedgerBluetoothAdapter] Ethereum app detected, verifying unlocked...',
        );

        try {
          const eth = new Eth(this.transport);
          await this.withTimeout(
            eth.getAddress("44'/60'/0'/0/0", false),
            LEDGER_OPERATION_TIMEOUT_MS,
            'Device unresponsive during verification',
          );
          console.log('[LedgerBluetoothAdapter] Device verified unlocked!');

          // Emit success event
          this.emitEvent({
            event: DeviceEvent.AppOpened,
            appName: 'Ethereum',
          });

          return true;
        } catch (verifyError) {
          console.log(
            '[LedgerBluetoothAdapter] Verification failed:',
            verifyError,
          );

          if (this.isDeviceLocked(verifyError)) {
            console.log('[LedgerBluetoothAdapter] Device is locked');
            this.emitEvent({
              event: DeviceEvent.DeviceLocked,
              error:
                verifyError instanceof Error
                  ? verifyError
                  : new Error(String(verifyError)),
            });
          }
          return false;
        }
      }

      // Wrong app or BOLOS screen
      console.log(
        '[LedgerBluetoothAdapter] Wrong app or BOLOS:',
        appName,
        '- user needs to open Ethereum app',
      );

      // Emit AppClosed event FIRST so UI updates immediately
      // Always use 'Ethereum' as the required app (what we want opened)
      this.emitEvent({ event: DeviceEvent.AppClosed, appName: 'Ethereum' });

      // Then send commands to the device
      if (appName === 'BOLOS') {
        // On BOLOS (main menu), try to open the Ethereum app
        // This sends a command to the device to prompt the user
        try {
          console.log(
            '[LedgerBluetoothAdapter] Requesting Ethereum app to open...',
          );
          await openEthereumAppOnLedger();
          console.log('[LedgerBluetoothAdapter] Open app command sent');
        } catch (openError) {
          console.log(
            '[LedgerBluetoothAdapter] Failed to send open app command:',
            openError,
          );
          // Continue anyway - user can manually open the app
        }
      } else {
        // Wrong app is open - try to close it first
        try {
          console.log('[LedgerBluetoothAdapter] Closing wrong app:', appName);
          await closeRunningAppOnLedger();
          console.log('[LedgerBluetoothAdapter] Close app command sent');
        } catch (closeError) {
          console.log(
            '[LedgerBluetoothAdapter] Failed to close app:',
            closeError,
          );
          // Continue anyway
        }
      }

      return false;
    } catch (error) {
      console.log('[LedgerBluetoothAdapter] doEnsureDeviceReady error:', error);

      if (this.isDeviceLocked(error)) {
        this.emitEvent({
          event: DeviceEvent.DeviceLocked,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }

      throw error;
    }
  }

  /**
   * Clean up all resources.
   * After calling destroy(), the adapter cannot be used.
   */
  destroy(): void {
    this.isDestroyed = true;

    // Stop Bluetooth monitoring
    this.stopBluetoothMonitoring();

    // Stop any active scan
    this.stopDeviceDiscovery();

    // Clear transport state callbacks
    this.transportStateCallbacks.clear();

    if (this.transport) {
      try {
        this.transport.close();
      } catch {
        // Ignore
      }
      this.transport = null;
    }

    this.deviceId = null;
  }

  // ============ Private Methods ============

  /**
   * Handle disconnect events from the transport
   *
   * Note: We only clear transport but preserve deviceId to allow reconnection
   * during app switch scenarios (BOLOS → Ethereum). The deviceId is only cleared
   * when explicitly disconnecting via disconnect() method.
   *
   * When polling for app readiness, we DO NOT emit disconnect events or call
   * onDisconnect callback since disconnects during app switch are expected.
   */
  private handleDisconnect(): void {
    this.transport = null;
    // NOTE: Don't clear deviceId here - we need it for reconnection during app switch
    // this.deviceId = null;

    // If flow is complete (success was shown), ignore disconnect events entirely
    // This prevents errors from showing after user has moved to account selection
    if (this.flowComplete) {
      console.log(
        '[LedgerBluetoothAdapter] handleDisconnect - flow complete, ignoring disconnect',
      );
      return;
    }

    // Check if we should try to reconnect (without emitting error)
    // This allows the polling loop to handle reconnection without flickering the UI
    if (this.restartCount < RESTART_LIMIT) {
      this.restartCount++;
      console.log(
        '[LedgerBluetoothAdapter] handleDisconnect - transport cleared, will attempt reconnect. restartCount:',
        this.restartCount,
      );
      // Don't emit error - the polling/operation will handle reconnection
      // This prevents state flickering to "disconnected" then "error"
      return;
    }

    // Restart limit reached - this is a fatal disconnect
    console.log(
      '[LedgerBluetoothAdapter] handleDisconnect - restart limit reached, emitting error',
    );
    this.restartCount = 0;
    this.deviceId = null;

    // Call the onDisconnect callback with an error
    // This will trigger handleError which shows the error state
    this.options.onDisconnect(new Error('Device disconnected'));
  }

  /**
   * Emit a device event through the options callback
   */
  private emitEvent(payload: DeviceEventPayload): void {
    this.options.onDeviceEvent(payload);
  }

  /**
   * Add timeout to an async operation
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    const timeoutError = new Error(errorMessage);
    timeoutError.name = 'LedgerTimeoutError';

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(timeoutError), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Check if error indicates device is locked
   */
  private isDeviceLocked(error: unknown): boolean {
    if (error === null || error === undefined) {
      return false;
    }

    // Type guard for error-like objects
    const errorObj = error as {
      name?: string;
      statusCode?: number;
      message?: string;
    };

    if (errorObj.name === 'TransportStatusError') {
      return errorObj.statusCode === DEVICE_LOCKED_STATUS_CODE;
    }
    if (
      typeof errorObj.message === 'string' &&
      errorObj.message.includes('Locked device')
    ) {
      return true;
    }
    return false;
  }

  // ============ Bluetooth State Management ============

  /**
   * Start monitoring Bluetooth state changes.
   * This is called in the constructor to track Bluetooth availability.
   */
  private startBluetoothMonitoring(): void {
    console.log('[LedgerBluetoothAdapter] Starting Bluetooth monitoring');

    // TransportBLE.observeState returns a Ledger-specific subscription type
    // We need to type this generically to avoid rxjs/Ledger subscription conflicts
    this.bleStateSubscription = TransportBLE.observeState({
      next: (event) => {
        const wasOn = this.isBluetoothOn;
        // Compare as string to avoid BleState type issues
        this.isBluetoothOn =
          event.available && event.type === BleState.PoweredOn;

        console.log(
          '[LedgerBluetoothAdapter] BLE state:',
          event.type,
          'available:',
          event.available,
          '-> isBluetoothOn:',
          this.isBluetoothOn,
        );

        // Notify listeners if state changed
        if (wasOn !== this.isBluetoothOn) {
          this.notifyTransportStateChange();
        }
      },
      error: (error: Error) => {
        console.error('[LedgerBluetoothAdapter] BLE state error:', error);
        this.isBluetoothOn = false;
        this.notifyTransportStateChange();
      },
      complete: () => {
        // Bluetooth state monitoring completed
      },
    });
  }

  /**
   * Stop monitoring Bluetooth state
   */
  private stopBluetoothMonitoring(): void {
    if (this.bleStateSubscription) {
      this.bleStateSubscription.unsubscribe();
      this.bleStateSubscription = null;
    }
  }

  /**
   * Notify all registered callbacks of transport state change
   */
  private notifyTransportStateChange(): void {
    for (const callback of this.transportStateCallbacks) {
      try {
        callback(this.isBluetoothOn);
      } catch (error) {
        console.error(
          '[LedgerBluetoothAdapter] Error in transport state callback:',
          error,
        );
      }
    }
  }
}

/**
 * Type guard to check if adapter is a LedgerBluetoothAdapter
 */
export const isLedgerBluetoothAdapter = (
  adapter: HardwareWalletAdapter,
): adapter is LedgerBluetoothAdapter =>
  adapter.walletType === HardwareWalletType.Ledger;

/**
 * Create a LedgerBluetoothAdapter instance
 */
export const createLedgerBluetoothAdapter = (
  options: HardwareWalletAdapterOptions,
): LedgerBluetoothAdapter => new LedgerBluetoothAdapter(options);
