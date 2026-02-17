// TODO: when hw overhaul is complete, all DevLogger.log calls should be removed

import TransportBLE, {
  default as BleTransport,
} from '@ledgerhq/react-native-hw-transport-ble';
import { State as BleState } from 'react-native-ble-plx';
import { Observable, Subscription } from 'rxjs';
import Eth from '@ledgerhq/hw-app-eth';
import {
  HardwareWalletType,
  DeviceEvent,
  DeviceEventPayload,
} from '@metamask/hw-wallet-sdk';
import {
  DiscoveredDevice,
  HardwareWalletAdapter,
  HardwareWalletAdapterOptions,
} from '../types';
import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../Ledger/Ledger';
import DevLogger from '../../SDKConnect/utils/DevLogger';

const DEVICE_LOCKED_STATUS_CODE = 0x6b0c;
const LEDGER_OPERATION_TIMEOUT_MS = 10000;
const DEFAULT_SCAN_TIMEOUT_MS = 30000;
const CONNECTION_RESTART_LIMIT = 5;

/**
 * Adapter for Ledger hardware wallets using Bluetooth Low Energy (BLE).
 *
 * This adapter encapsulates all BLE transport logic for communicating with
 * Ledger devices. It implements the HardwareWalletAdapter interface to provide
 * a unified API for the hardware wallet context.
 */

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

  private isBluetoothOn = false;
  private hasReceivedInitialBleState = false;
  private initialBleStatePromise: Promise<void>;
  private resolveInitialBleState: (() => void) | null = null;
  private bleStateSubscription: { unsubscribe: () => void } | null = null;
  private scanSubscription: Subscription | null = null;
  private scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private transportStateCallbacks: Set<(isAvailable: boolean) => void> =
    new Set();

  constructor(options: HardwareWalletAdapterOptions) {
    this.options = options;
    // Create promise for initial BLE state
    this.initialBleStatePromise = new Promise((resolve) => {
      this.resolveInitialBleState = resolve;
    });
    // Start monitoring Bluetooth state immediately
    this.startBluetoothMonitoring();
  }

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
      const transport = await TransportBLE.open(deviceId);
      this.transport = transport;
      this.deviceId = deviceId;
      this.restartCount = 0;

      // Set up disconnect handler. Ignore events from a transport we've since replaced (stale events after reconnect).
      transport.on('disconnect', () => {
        if (this.transport !== transport) return;
        this.handleDisconnect();
      });

      // Set up error handler to catch BLE errors after disconnect.
      // Ignore events from a transport we've since replaced (stale events after reconnect).
      transport.on('error', (error: Error) => {
        if (this.transport !== transport) return;
        DevLogger.log(
          '[LedgerBluetoothAdapter] Transport error:',
          error.message,
        );
        if (this.flowComplete) {
          DevLogger.log(
            '[LedgerBluetoothAdapter] Flow complete - ignoring transport error',
          );
          return;
        }
        this.handleDisconnect();
      });

      this.emitEvent({
        event: DeviceEvent.Connected,
        deviceId,
      });
    } catch (error) {
      this.clearTransportState({ resetRestartCount: false });

      this.emitEvent({
        event: DeviceEvent.ConnectionFailed,
        error: this.toError(error),
      });

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const previousDeviceId = this.deviceId;
    await this.closeTransport();
    this.clearTransportState();

    if (previousDeviceId && !this.flowComplete) {
      this.emitEvent({
        event: DeviceEvent.Disconnected,
        deviceId: previousDeviceId,
      });
    }
  }

  reset(): void {
    DevLogger.log('[LedgerBluetoothAdapter] Resetting adapter state');
    this.flowComplete = false;
    void this.closeTransport();
    this.clearTransportState();
  }

  markFlowComplete(): void {
    DevLogger.log('[LedgerBluetoothAdapter] Marking flow as complete');
    this.flowComplete = true;
  }

  isFlowComplete(): boolean {
    return this.flowComplete;
  }

  resetFlowState(): void {
    DevLogger.log('[LedgerBluetoothAdapter] Resetting flow state');
    this.flowComplete = false;
  }

  getConnectedDeviceId(): string | null {
    return this.deviceId;
  }

  isConnected(): boolean {
    return this.transport !== null;
  }

  startDeviceDiscovery(
    onDeviceFound: (device: DiscoveredDevice) => void,
    onError: (error: Error) => void,
  ): () => void {
    DevLogger.log('[LedgerBluetoothAdapter] startDeviceDiscovery called');

    // Note: We don't check isBluetoothOn here because:
    // 1. The BLE state observer is async - it may not have fired yet
    // 2. TransportBLE.listen will fail naturally if BLE is unavailable
    // 3. Checking too early causes race conditions on startup

    // Stop any existing scan
    this.stopDeviceDiscovery();

    const seenDevices = new Set<string>();

    DevLogger.log('[LedgerBluetoothAdapter] Starting TransportBLE.listen');

    this.scanSubscription = new Observable(TransportBLE.listen).subscribe({
      next: (event: {
        type: string;
        descriptor: { id: string; name: string };
      }) => {
        DevLogger.log(
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
          DevLogger.log(
            '[LedgerBluetoothAdapter] Found device:',
            discoveredDev.name,
          );
          onDeviceFound(discoveredDev);
        }
      },
      error: (error: Error) => {
        DevLogger.log('[LedgerBluetoothAdapter] BLE scan error:', error);
        this.stopDeviceDiscovery();
        onError(error);
      },
      complete: () => {
        DevLogger.log('[LedgerBluetoothAdapter] BLE scan completed');
      },
    });

    this.scanTimeoutId = setTimeout(() => {
      DevLogger.log('[LedgerBluetoothAdapter] Scan timeout reached');
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

  stopDeviceDiscovery(): void {
    DevLogger.log('[LedgerBluetoothAdapter] stopDeviceDiscovery called');

    if (this.scanSubscription) {
      this.scanSubscription.unsubscribe();
      this.scanSubscription = null;
    }

    if (this.scanTimeoutId) {
      clearTimeout(this.scanTimeoutId);
      this.scanTimeoutId = null;
    }
  }

  async isTransportAvailable(): Promise<boolean> {
    // Wait for initial BLE state if not yet received
    if (!this.hasReceivedInitialBleState) {
      DevLogger.log(
        '[LedgerBluetoothAdapter] Waiting for initial BLE state...',
      );
      await this.initialBleStatePromise;
      DevLogger.log(
        '[LedgerBluetoothAdapter] Initial BLE state received:',
        this.isBluetoothOn,
      );
    }
    return this.isBluetoothOn;
  }

  onTransportStateChange(callback: (isAvailable: boolean) => void): () => void {
    this.transportStateCallbacks.add(callback);

    callback(this.isBluetoothOn);

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
    DevLogger.log(
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
        if (this.isDisconnectError(error) && attempt < MAX_DISCONNECT_RETRIES) {
          DevLogger.log(
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

    return false;
  }

  /**
   * Internal implementation of device readiness check.
   * Separated to allow retry wrapper in ensureDeviceReady.
   */
  private async doEnsureDeviceReady(deviceId: string): Promise<boolean> {
    // Connect if needed
    if (!this.isConnected() || this.deviceId !== deviceId) {
      DevLogger.log('[LedgerBluetoothAdapter] Connecting first...');
      await this.connect(deviceId);
    }

    if (!this.transport) {
      DevLogger.log('[LedgerBluetoothAdapter] No transport after connect');
      return false;
    }

    try {
      // Check which app is open
      DevLogger.log('[LedgerBluetoothAdapter] Checking app...');
      const appName = await this.withTimeout(
        connectLedgerHardware(this.transport, deviceId),
        LEDGER_OPERATION_TIMEOUT_MS,
        'Device unresponsive',
      );
      DevLogger.log('[LedgerBluetoothAdapter] Got app name:', appName);

      if (appName === 'Ethereum') {
        // Correct app is open - verify device is unlocked
        DevLogger.log(
          '[LedgerBluetoothAdapter] Ethereum app detected, verifying unlocked...',
        );

        try {
          const eth = new Eth(this.transport);
          await this.withTimeout(
            eth.getAddress("44'/60'/0'/0/0", false),
            LEDGER_OPERATION_TIMEOUT_MS,
            'Device unresponsive during verification',
          );
          DevLogger.log('[LedgerBluetoothAdapter] Device verified unlocked!');

          // Emit success event
          this.emitEvent({
            event: DeviceEvent.AppOpened,
            currentAppName: 'Ethereum',
          });

          return true;
        } catch (verifyError) {
          DevLogger.log(
            '[LedgerBluetoothAdapter] Verification failed:',
            verifyError,
          );

          if (this.isDisconnectError(verifyError)) {
            throw verifyError;
          }

          if (this.isDeviceLocked(verifyError)) {
            DevLogger.log('[LedgerBluetoothAdapter] Device is locked');
            this.emitEvent({
              event: DeviceEvent.DeviceLocked,
              error: this.toError(verifyError),
            });
          }
          return false;
        }
      }

      // Wrong app or BOLOS screen
      DevLogger.log(
        '[LedgerBluetoothAdapter] Wrong app or BOLOS:',
        appName,
        '- user needs to open Ethereum app',
      );

      // Emit AppClosed event FIRST so UI updates immediately
      // Always use 'Ethereum' as the required app (what we want opened)
      this.emitEvent({
        event: DeviceEvent.AppNotOpen,
        currentAppName: 'Ethereum',
      });

      // Then send commands to the device
      if (appName === 'BOLOS') {
        // On BOLOS (main menu), try to open the Ethereum app
        // This sends a command to the device to prompt the user
        try {
          DevLogger.log(
            '[LedgerBluetoothAdapter] Requesting Ethereum app to open...',
          );
          await openEthereumAppOnLedger();
          DevLogger.log('[LedgerBluetoothAdapter] Open app command sent');
        } catch (openError) {
          DevLogger.log(
            '[LedgerBluetoothAdapter] Failed to send open app command:',
            openError,
          );
          // Continue anyway - user can manually open the app
        }
      } else {
        // Wrong app is open - try to close it first
        try {
          DevLogger.log('[LedgerBluetoothAdapter] Closing wrong app:', appName);
          await closeRunningAppOnLedger();
          DevLogger.log('[LedgerBluetoothAdapter] Close app command sent');
        } catch (closeError) {
          DevLogger.log(
            '[LedgerBluetoothAdapter] Failed to close app:',
            closeError,
          );
          // Continue anyway
        }
      }

      return false;
    } catch (error) {
      DevLogger.log(
        '[LedgerBluetoothAdapter] doEnsureDeviceReady error:',
        error,
      );

      if (this.isDeviceLocked(error)) {
        this.emitEvent({
          event: DeviceEvent.DeviceLocked,
          error: this.toError(error),
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

    void this.closeTransport();
    this.clearTransportState();
  }

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
    // If flow is complete (success was shown), ignore disconnect events entirely
    // This prevents errors from showing after user has moved to account selection
    if (this.flowComplete) {
      DevLogger.log(
        '[LedgerBluetoothAdapter] handleDisconnect - flow complete, ignoring disconnect',
      );
      return;
    }

    // Check if we should try to reconnect (without emitting error)
    // This allows the polling loop to handle reconnection without flickering the UI
    if (this.restartCount < CONNECTION_RESTART_LIMIT) {
      this.restartCount++;
      DevLogger.log(
        '[LedgerBluetoothAdapter] handleDisconnect - transport cleared, will attempt reconnect. restartCount:',
        this.restartCount,
      );
      // Don't emit error - the polling/operation will handle reconnection
      // This prevents state flickering to "disconnected" then "error"
      return;
    }

    // Restart limit reached - this is a fatal disconnect
    DevLogger.log(
      '[LedgerBluetoothAdapter] handleDisconnect - restart limit reached, emitting error',
    );
    this.clearTransportState();

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
   * Close transport and set to null. Ignores close errors.
   * Call with await when you need to wait for close (e.g. disconnect); call without await for fire-and-forget (e.g. reset, destroy).
   */
  private async closeTransport(): Promise<void> {
    if (this.transport) {
      try {
        await this.transport.close();
      } catch {
        // Ignore close errors
      }
      this.transport = null;
    }
  }

  /**
   * Clear transport state. Optionally clear deviceId and restartCount.
   */
  private clearTransportState(options?: {
    clearDeviceId?: boolean;
    resetRestartCount?: boolean;
  }): void {
    const { clearDeviceId = true, resetRestartCount = true } = options ?? {};
    this.transport = null;
    if (clearDeviceId) {
      this.deviceId = null;
    }
    if (resetRestartCount) {
      this.restartCount = 0;
    }
  }

  /**
   * Normalize unknown value to Error for event/callback payloads.
   */
  private toError(value: unknown): Error {
    return value instanceof Error ? value : new Error(String(value));
  }

  /**
   * Resolve the initial BLE state promise if still pending (called from BLE state observer).
   */
  private resolveInitialBleStateIfPending(): void {
    this.hasReceivedInitialBleState = true;
    if (this.resolveInitialBleState) {
      this.resolveInitialBleState();
      this.resolveInitialBleState = null;
    }
  }

  /**
   * Add timeout to an async operation. Clears the timer when the main promise settles first.
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    const timeoutError = new Error(errorMessage);
    timeoutError.name = 'LedgerTimeoutError';

    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(timeoutError), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() =>
      clearTimeout(timeoutId),
    );
  }

  /**
   * Check if error indicates a Ledger transport disconnect (so caller can retry).
   */
  private isDisconnectError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === 'DisconnectedDevice' ||
        error.name === 'DisconnectedDeviceDuringOperation')
    );
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

  /**
   * Start monitoring Bluetooth state changes.
   * This is called in the constructor to track Bluetooth availability.
   */
  private startBluetoothMonitoring(): void {
    DevLogger.log('[LedgerBluetoothAdapter] Starting Bluetooth monitoring');

    // TransportBLE.observeState returns a Ledger-specific subscription type
    // We need to type this generically to avoid rxjs/Ledger subscription conflicts
    this.bleStateSubscription = TransportBLE.observeState({
      next: (event) => {
        const wasOn = this.isBluetoothOn;
        const isFirstState = !this.hasReceivedInitialBleState;

        // Compare as string to avoid BleState type issues
        this.isBluetoothOn =
          event.available && event.type === BleState.PoweredOn;

        DevLogger.log(
          '[LedgerBluetoothAdapter] BLE state:',
          event.type,
          'available:',
          event.available,
          '-> isBluetoothOn:',
          this.isBluetoothOn,
        );

        // Resolve initial state promise on first update
        if (isFirstState) {
          this.resolveInitialBleStateIfPending();
        }

        // Notify listeners if state changed (or on first state)
        if (wasOn !== this.isBluetoothOn || isFirstState) {
          this.notifyTransportStateChange();
        }
      },
      error: (error: Error) => {
        DevLogger.log('[LedgerBluetoothAdapter] BLE state error:', error);
        this.isBluetoothOn = false;

        // Also resolve initial state promise on error
        if (!this.hasReceivedInitialBleState) {
          this.resolveInitialBleStateIfPending();
        }

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
        DevLogger.log(
          '[LedgerBluetoothAdapter] Error in transport state callback:',
          error,
        );
      }
    }
  }
}
