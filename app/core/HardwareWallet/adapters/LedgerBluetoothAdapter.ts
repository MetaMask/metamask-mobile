import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import { Observable, Subscription } from 'rxjs';
import Eth from '@ledgerhq/hw-app-eth';
import {
  HardwareWalletType,
  DeviceEvent,
  DeviceEventPayload,
  ErrorCode,
  HardwareWalletError,
} from '@metamask/hw-wallet-sdk';
import { createHardwareWalletError } from '../errors';
import {
  DiscoveredDevice,
  EnsureDeviceReadyOptions,
  HardwareWalletAdapter,
  HardwareWalletAdapterOptions,
} from '../types';
import { connectLedgerHardware } from '../../Ledger/Ledger';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import { BluetoothStateMonitor } from './shared/bluetooth-state-monitor';
import { withLedgerTimeout } from './shared/with-timeout';
import { handleWrongLedgerApp } from './shared/ledger-app-handlers';
import {
  REQUIRED_APP_NAME,
  VERIFICATION_DERIVATION_PATH,
  LEDGER_OPERATION_TIMEOUT_MS,
  DEFAULT_SCAN_TIMEOUT_MS,
  MAX_DISCONNECT_RETRIES,
  RETRY_DELAY_MS,
} from './shared/ledger-constants';
import { ensureLedgerPermissions } from './shared/ledger-permissions';
import {
  TRANSIENT_BLE_ERROR_NAMES,
  isDeviceLockedError,
  hasTransientBleMessage,
  toError,
} from './shared/ledger-errors';

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

  #transport: TransportBLE | null = null;
  #deviceId: string | null = null;
  #options: HardwareWalletAdapterOptions;
  #isDestroyed = false;
  #connectInFlight: Promise<void> | null = null;
  #flowComplete = false;
  readonly #bleMonitor: BluetoothStateMonitor;
  #scanSubscription: Subscription | null = null;
  #scanTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(options: HardwareWalletAdapterOptions) {
    this.#options = options;
    this.#bleMonitor = new BluetoothStateMonitor();
  }

  /**
   * Guard for public entry points: throws if the adapter has been destroyed.
   * Named to pair with `ensureDeviceReady`.
   */
  #assertAdapterReady(): void {
    if (this.#isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }
  }

  async connect(deviceId: string): Promise<void> {
    this.#assertAdapterReady();

    if (this.#connectInFlight) {
      await this.#connectInFlight;
      if (this.#transport && this.#deviceId === deviceId) return;
      this.#assertAdapterReady();
    }

    if (this.#transport && this.#deviceId === deviceId) {
      return;
    }

    if (this.#transport) {
      await this.disconnect();
    }

    this.#connectInFlight = this.#doConnect(deviceId);
    try {
      await this.#connectInFlight;
    } finally {
      this.#connectInFlight = null;
    }
  }

  async #doConnect(deviceId: string): Promise<void> {
    try {
      const transport = await TransportBLE.open(deviceId);

      if (transport == null) {
        this.#clearTransportState();
        this.#emitEvent({
          event: DeviceEvent.ConnectionFailed,
          error: new Error('Failed to open transport'),
        });
        return;
      }

      if (this.#isDestroyed) {
        try {
          await transport.close();
        } catch {
          // Ignore close errors
        }
        return;
      }

      this.#transport = transport;
      this.#deviceId = deviceId;

      transport.on('disconnect', () => {
        if (this.#transport !== transport) return;
        this.#handleDisconnect();
      });

      transport.on('error', (error: Error) => {
        if (this.#transport !== transport) return;
        DevLogger.log(
          '[LedgerBluetoothAdapter] Transport error:',
          error.message,
        );
        if (this.#flowComplete) {
          DevLogger.log(
            '[LedgerBluetoothAdapter] Flow complete - ignoring transport error',
          );
          return;
        }
        this.#handleDisconnect();
      });

      this.#emitEvent({
        event: DeviceEvent.Connected,
        deviceId,
      });
    } catch (error) {
      this.#clearTransportState();

      this.#emitEvent({
        event: DeviceEvent.ConnectionFailed,
        error: toError(error),
      });

      throw error;
    }
  }

  async disconnect(): Promise<void> {
    const previousDeviceId = this.#deviceId;
    await this.#closeTransport();
    this.#clearTransportState();

    if (previousDeviceId && !this.#flowComplete) {
      this.#emitEvent({
        event: DeviceEvent.Disconnected,
        deviceId: previousDeviceId,
      });
    }
  }

  reset(): void {
    DevLogger.log('[LedgerBluetoothAdapter] Resetting adapter state');
    this.#flowComplete = false;
    void this.#closeTransport();
    this.#clearTransportState();
  }

  markFlowComplete(): void {
    DevLogger.log('[LedgerBluetoothAdapter] Marking flow as complete');
    this.#flowComplete = true;
  }

  isFlowComplete(): boolean {
    return this.#flowComplete;
  }

  resetFlowState(): void {
    DevLogger.log('[LedgerBluetoothAdapter] Resetting flow state');
    this.#flowComplete = false;
    void this.#closeTransport();
  }

  getConnectedDeviceId(): string | null {
    return this.#deviceId;
  }

  isConnected(): boolean {
    return this.#transport !== null;
  }

  startDeviceDiscovery(
    onDeviceFound: (device: DiscoveredDevice) => void,
    onError: (error: Error) => void,
  ): () => void {
    this.#assertAdapterReady();

    DevLogger.log('[LedgerBluetoothAdapter] startDeviceDiscovery called');

    // Note: We don't check isBluetoothOn here because:
    // 1. The BLE state observer is async - it may not have fired yet
    // 2. TransportBLE.listen will fail naturally if BLE is unavailable
    // 3. Checking too early causes race conditions on startup

    this.stopDeviceDiscovery(); // TODO: rename to stopScanning()

    const seenDevices = new Set<string>();

    DevLogger.log('[LedgerBluetoothAdapter] Starting TransportBLE.listen');

    this.#scanSubscription = new Observable(TransportBLE.listen).subscribe({
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

    this.#scanTimeoutId = setTimeout(() => {
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

    if (this.#scanSubscription) {
      this.#scanSubscription.unsubscribe();
      this.#scanSubscription = null;
    }

    if (this.#scanTimeoutId) {
      clearTimeout(this.#scanTimeoutId);
      this.#scanTimeoutId = null;
    }
  }

  async ensurePermissions(): Promise<boolean> {
    return ensureLedgerPermissions();
  }

  async isTransportAvailable(): Promise<boolean> {
    // Wait for initial BLE state if not yet received
    if (!this.#bleMonitor.hasReceivedInitialState) {
      DevLogger.log(
        '[LedgerBluetoothAdapter] Waiting for initial BLE state...',
      );
      await this.#bleMonitor.waitForInitialState();
      DevLogger.log(
        '[LedgerBluetoothAdapter] Initial BLE state received:',
        this.#bleMonitor.isOn,
      );
    }
    return this.#bleMonitor.isOn;
  }

  onTransportStateChange(callback: (isAvailable: boolean) => void): () => void {
    return this.#bleMonitor.onChange(callback);
  }

  getRequiredAppName(): string {
    return REQUIRED_APP_NAME;
  }

  getTransportDisabledErrorCode(): ErrorCode {
    return ErrorCode.BluetoothDisabled;
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
   * Handles transient BLE errors (e.g., during app switch) by retrying.
   *
   * @param deviceId - The device ID to connect to
   * @returns true if device is ready, false otherwise
   */
  async ensureDeviceReady(
    deviceId: string,
    options?: EnsureDeviceReadyOptions,
  ): Promise<boolean> {
    this.#assertAdapterReady();

    DevLogger.log(
      '[LedgerBluetoothAdapter] ensureDeviceReady called for:',
      deviceId,
    );

    // Retry on transient BLE errors (e.g., device switching apps)
    for (let attempt = 1; attempt <= MAX_DISCONNECT_RETRIES; attempt++) {
      try {
        return await this.#doEnsureDeviceReady(deviceId, options);
      } catch (error) {
        if (
          this.#isTransientBleError(error) &&
          attempt < MAX_DISCONNECT_RETRIES
        ) {
          DevLogger.log(
            `[LedgerBluetoothAdapter] Transient BLE error during check (attempt ${attempt}/${MAX_DISCONNECT_RETRIES}), retrying...`,
          );
          await this.#closeTransport();
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }

        // Non-transient error or max retries reached
        throw error;
      }
    }

    return false;
  }

  /** Internal readiness check, called by ensureDeviceReady's retry loop. */
  async #doEnsureDeviceReady(
    deviceId: string,
    options?: EnsureDeviceReadyOptions,
  ): Promise<boolean> {
    if (!this.isConnected() || this.#deviceId !== deviceId) {
      DevLogger.log('[LedgerBluetoothAdapter] Connecting first...');
      await this.connect(deviceId);
    }

    if (!this.#transport) {
      DevLogger.log('[LedgerBluetoothAdapter] No transport after connect');
      return false;
    }

    try {
      DevLogger.log('[LedgerBluetoothAdapter] Checking app...');
      const abortController = new AbortController();
      const currentAppName = await withLedgerTimeout(
        connectLedgerHardware(
          this.#transport,
          deviceId,
          abortController.signal,
        ),
        LEDGER_OPERATION_TIMEOUT_MS,
        'Device unresponsive',
        () => {
          abortController.abort();
          return this.#closeTransport();
        },
      );
      DevLogger.log('[LedgerBluetoothAdapter] Got app name:', currentAppName);

      if (currentAppName === REQUIRED_APP_NAME) {
        return await this.#verifyEthereumAppUnlocked(options);
      }

      await this.#handleWrongApp(currentAppName);
      return false;
    } catch (error) {
      DevLogger.log(
        '[LedgerBluetoothAdapter] doEnsureDeviceReady error:',
        error,
      );

      if (this.#isDeviceLocked(error)) {
        this.#emitEvent({
          event: DeviceEvent.DeviceLocked,
          error: toError(error),
        });
      }

      throw error;
    }
  }

  /**
   * Verify the Ethereum app is unlocked by requesting an address.
   * Rethrows transient BLE errors to allow retry in ensureDeviceReady.
   */
  async #verifyEthereumAppUnlocked(
    options?: EnsureDeviceReadyOptions,
  ): Promise<boolean> {
    DevLogger.log(
      '[LedgerBluetoothAdapter] Ethereum app detected, verifying unlocked...',
    );

    try {
      if (!this.#transport) {
        throw new Error('Transport not available');
      }
      const eth = new Eth(this.#transport);
      await withLedgerTimeout(
        eth.getAddress(VERIFICATION_DERIVATION_PATH, false),
        LEDGER_OPERATION_TIMEOUT_MS,
        'Device unresponsive during verification',
        () => this.#closeTransport(),
      );
      DevLogger.log('[LedgerBluetoothAdapter] Device verified unlocked!');

      const requireBlindSigning = options?.requireBlindSigning ?? false;
      if (requireBlindSigning) {
        const { arbitraryDataEnabled } = await withLedgerTimeout(
          eth.getAppConfiguration(),
          LEDGER_OPERATION_TIMEOUT_MS,
          'Device unresponsive during blind signing check',
          () => this.#closeTransport(),
        );
        // Ledger's hw-app-eth getAppConfiguration derives this from response[0] & 0x01:
        // 1 means arbitrary data/blind signing is enabled, 0 means it is disabled.
        // Source: https://github.com/LedgerHQ/ledgerjs/blob/main/packages/hw-app-eth/src/getAppConfiguration.ts
        if (arbitraryDataEnabled !== 1) {
          throw createHardwareWalletError(
            ErrorCode.DeviceStateBlindSignNotSupported,
            HardwareWalletType.Ledger,
            'Blind signing is not enabled',
          );
        }
      }

      this.#emitEvent({
        event: DeviceEvent.AppOpened,
        currentAppName: REQUIRED_APP_NAME,
      });
      return true;
    } catch (verifyError) {
      DevLogger.log(
        '[LedgerBluetoothAdapter] Verification failed:',
        verifyError,
      );

      if (this.#isTransientBleError(verifyError)) {
        throw verifyError;
      }

      if (verifyError instanceof HardwareWalletError) {
        throw verifyError;
      }

      if (this.#isDeviceLocked(verifyError)) {
        DevLogger.log('[LedgerBluetoothAdapter] Device is locked');
        this.#emitEvent({
          event: DeviceEvent.DeviceLocked,
          error: toError(verifyError),
        });
      }
      return false;
    }
  }

  /**
   * Handle wrong app or BOLOS screen: emit AppNotOpen and attempt app switch.
   */
  async #handleWrongApp(appName: string): Promise<void> {
    await handleWrongLedgerApp({
      appName,
      cleanup: () => this.#closeTransport(),
      emitAppNotOpen: () =>
        this.#emitEvent({
          event: DeviceEvent.AppNotOpen,
          currentAppName: REQUIRED_APP_NAME,
        }),
      log: (...args: unknown[]) =>
        DevLogger.log('[LedgerBluetoothAdapter]', ...args),
    });
  }

  destroy(): void {
    this.#isDestroyed = true;
    this.#bleMonitor.dispose();
    this.stopDeviceDiscovery();

    void this.#closeTransport();
    this.#clearTransportState();
  }

  /**
   * Handle disconnect events from the transport.
   *
   * Clears the transport reference but preserves deviceId for reconnection.
   * Does NOT call onDisconnect — disconnect handling is consolidated into
   * ensureDeviceReady's retry loop, which catches transport errors and
   * retries automatically. This avoids false-positive error UI from
   * transient BLE disconnects (e.g. Ledger app switching).
   */
  #handleDisconnect(): void {
    this.#transport = null;
    DevLogger.log(
      '[LedgerBluetoothAdapter] handleDisconnect - transport cleared',
    );
  }

  #emitEvent(payload: DeviceEventPayload): void {
    this.#options.onDeviceEvent(payload);
  }

  async #closeTransport(): Promise<void> {
    const transport = this.#transport;
    const deviceId = this.#deviceId;
    this.#transport = null;

    try {
      if (transport) {
        if (deviceId) {
          // TransportBLE.close() queues a delayed disconnect (5s timeout).
          // Force an immediate BLE disconnection so in-flight signing is
          // aborted without delay.
          await TransportBLE.disconnectDevice(deviceId);
        } else {
          await transport.close();
        }
      } else if (deviceId) {
        // Transport already cleared (e.g. by #handleDisconnect) but device
        // ID still set — force BLE cleanup so the OS stack doesn't keep a
        // stale connection that blocks the next TransportBLE.open() call.
        await TransportBLE.disconnectDevice(deviceId);
      }
    } catch {
      // Ignore close errors — device may already be disconnected
    }
  }

  #clearTransportState(): void {
    this.#transport = null;
    this.#deviceId = null;
  }

  /**
   * Check if error is a transient BLE error that can be retried
   * (disconnects during app switch, pairing failures during reconnect, etc.)
   *
   * Checks error name first, then falls back to message-based detection
   * for BLE errors that use generic Error names after a device power-cycle.
   */
  #isTransientBleError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    if (TRANSIENT_BLE_ERROR_NAMES.includes(error.name)) return true;

    return hasTransientBleMessage(error.message ?? '');
  }

  /**
   * Check if error indicates device is locked
   */
  #isDeviceLocked(error: unknown): boolean {
    return isDeviceLockedError(error);
  }
}
