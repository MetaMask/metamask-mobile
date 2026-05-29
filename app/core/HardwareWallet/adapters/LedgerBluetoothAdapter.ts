import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import { State as BleState } from 'react-native-ble-plx';
import { Linking, Platform } from 'react-native';
import { Subscription, firstValueFrom, distinctUntilChanged, debounceTime } from 'rxjs';
import type {
  DeviceManagementKit,
  DiscoveredDevice as DmkDiscoveredDevice,
  DeviceSessionState,
} from '@ledgerhq/device-management-kit';
import {
  HardwareWalletType,
  DeviceEvent,
  DeviceEventPayload,
  ErrorCode,
} from '@metamask/hw-wallet-sdk';
import {
  PERMISSIONS,
  RESULTS,
  requestMultiple,
  request,
} from 'react-native-permissions';
import { getSystemVersion } from 'react-native-device-info';
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
import { DISCONNECT_ERROR_NAMES } from '../../Ledger/ledgerErrors';
import { getDmk } from '../../Ledger/dmk';

const DEVICE_LOCKED_STATUS_CODE = 0x6b0c;
const LEDGER_OPERATION_TIMEOUT_MS = 10000;
const DEFAULT_SCAN_TIMEOUT_MS = 30000;
const MAX_DISCONNECT_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

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

  #sessionId: string | null = null;
  #deviceId: string | null = null;
  #options: HardwareWalletAdapterOptions;
  #isDestroyed = false;
  #connectInFlight: Promise<void> | null = null;
  #flowComplete = false;
  #isBluetoothOn = false;
  #hasReceivedInitialBleState = false;
  #initialBleStatePromise: Promise<void>;
  #resolveInitialBleState: (() => void) | null = null;
  #bleStateSubscription: { unsubscribe: () => void } | null = null;
  #scanSubscription: Subscription | null = null;
  #scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
  #transportStateCallbacks: Set<(isAvailable: boolean) => void> = new Set();
  #discoveredDevices: Map<string, DmkDiscoveredDevice> = new Map();
  #sessionStateSubscription: { unsubscribe: () => void } | null = null;

  constructor(options: HardwareWalletAdapterOptions) {
    this.#options = options;
    this.#initialBleStatePromise = new Promise((resolve) => {
      this.#resolveInitialBleState = resolve;
    });
    this.#startBluetoothMonitoring();
  }

  async connect(deviceId: string): Promise<void> {
    if (this.#isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }

    if (this.#connectInFlight) {
      await this.#connectInFlight;
      if (this.#sessionId && this.#deviceId === deviceId) return;
      if (this.#isDestroyed) throw new Error('Adapter has been destroyed');
    }

    if (this.#sessionId && this.#deviceId === deviceId) {
      return;
    }

    if (this.#sessionId) {
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
      const device = this.#discoveredDevices.get(deviceId);
      if (!device) {
        this.#clearTransportState();
        this.#emitEvent({
          event: DeviceEvent.ConnectionFailed,
          error: new Error(`No cached DiscoveredDevice for deviceId: ${deviceId}`),
        });
        return;
      }

      const dmk = getDmk();
      console.log('[DMK] #doConnect - calling dmk.connect() for device:', deviceId);
      const sessionId = await dmk.connect({ device });
      console.log('[DMK] #doConnect - got sessionId:', sessionId);

      if (this.#isDestroyed) {
        try {
          await dmk.disconnect({ sessionId });
        } catch {
          // Ignore
        }
        return;
      }

      this.#sessionId = sessionId;
      this.#deviceId = deviceId;

      try {
        getDmk().disableDeviceSessionRefresher({ sessionId });
        console.log('[DMK] #doConnect - session refresher disabled');
      } catch (e) {
        console.log('[DMK] #doConnect - disableDeviceSessionRefresher error:', e);
      }

      this.#startSessionMonitoring(sessionId);

      this.#emitEvent({
        event: DeviceEvent.Connected,
        deviceId,
      });
    } catch (error) {
      console.log('[DMK] #doConnect - connect error:', error);
      this.#clearTransportState();

      this.#emitEvent({
        event: DeviceEvent.ConnectionFailed,
        error: this.#toError(error),
      });

      throw error;
    }
  }

  #startSessionMonitoring(sessionId: string): void {
    this.#sessionStateSubscription?.unsubscribe();
    console.log('[DMK] #startSessionMonitoring - subscribing to session state for:', sessionId);

    const dmk = getDmk();
    this.#sessionStateSubscription = dmk
      .getDeviceSessionState({ sessionId })
      .pipe(
        distinctUntilChanged(
          (a: DeviceSessionState, b: DeviceSessionState) =>
            a.deviceStatus === b.deviceStatus,
        ),
        debounceTime(3000),
      )
      .subscribe({
        next: (state: DeviceSessionState) => {
          if (
            state.deviceStatus === 'NOT CONNECTED' ||
            state.deviceStatus === 'LOCKED'
          ) {
            console.log('[DMK] #startSessionMonitoring - deviceStatus:', state.deviceStatus);
          }
          if (state.deviceStatus === 'NOT CONNECTED') {
            this.#handleDisconnect();
          }
        },
        complete: () => {
          this.#handleDisconnect();
        },
        error: () => {
          this.#handleDisconnect();
        },
      });
  }

  async disconnect(): Promise<void> {
    const previousDeviceId = this.#deviceId;
    await this.#closeSession('disconnect');
    this.#clearTransportState();

    if (previousDeviceId && !this.#flowComplete) {
      this.#emitEvent({
        event: DeviceEvent.Disconnected,
        deviceId: previousDeviceId,
      });
    }
  }

  reset(): void {
    console.log('[LedgerBluetoothAdapter] Resetting adapter state');
    this.#flowComplete = false;
    void this.#closeSession('reset');
    this.#clearTransportState();
  }

  markFlowComplete(): void {
    console.log('[LedgerBluetoothAdapter] Marking flow as complete');
    this.#flowComplete = true;
  }

  isFlowComplete(): boolean {
    return this.#flowComplete;
  }

  resetFlowState(): void {
    console.log('[LedgerBluetoothAdapter] Resetting flow state');
    this.#flowComplete = false;
  }

  getConnectedDeviceId(): string | null {
    return this.#deviceId;
  }

  isConnected(): boolean {
    return this.#sessionId !== null;
  }

  startDeviceDiscovery(
    onDeviceFound: (device: DiscoveredDevice) => void,
    onError: (error: Error) => void,
  ): () => void {
    if (this.#isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }

    console.log('[LedgerBluetoothAdapter] startDeviceDiscovery called');

    this.stopDeviceDiscovery();

    void this.#startDiscoveryInner(onDeviceFound, onError);

    return () => this.stopDeviceDiscovery();
  }

  async #startDiscoveryInner(
    onDeviceFound: (device: DiscoveredDevice) => void,
    onError: (error: Error) => void,
  ): Promise<void> {

    // Note: We don't check isBluetoothOn here because:
    // 1. The BLE state observer is async - it may not have fired yet
    // 2. TransportBLE.listen will fail naturally if BLE is unavailable
    // 3. Checking too early causes race conditions on startup

    this.stopDeviceDiscovery(); // TODO: rename to stopScanning()

    await this.#cleanupStaleConnections();

    const seenDevices = new Set<string>();

    console.log('[LedgerBluetoothAdapter] Starting DMK discovery');

    const dmk = getDmk();

    console.log('[DMK] startDeviceDiscovery - calling dmk.listenToAvailableDevices()');
    this.#scanSubscription = dmk
      .listenToAvailableDevices({})
      .subscribe({
        next: (devices: DmkDiscoveredDevice[]) => {
          console.log(
            '[LedgerBluetoothAdapter] DMK scan batch:',
            devices.length,
            'devices',
          );
          for (const device of devices) {
            if (!seenDevices.has(device.id)) {
              seenDevices.add(device.id);
              this.#discoveredDevices.set(device.id, device);
              const discoveredDev: DiscoveredDevice = {
                id: device.id,
                name: device.name || 'Unknown Device',
              };
              console.log(
                '[LedgerBluetoothAdapter] Found device:',
                discoveredDev.name,
              );
              onDeviceFound(discoveredDev);
            }
          }
        },
        error: (error: Error) => {
          console.log('[LedgerBluetoothAdapter] DMK scan error:', error);
          this.stopDeviceDiscovery();
          onError(error);
        },
        complete: () => {
          console.log('[LedgerBluetoothAdapter] DMK scan completed');
        },
      });

    this.#scanTimeoutId = setTimeout(() => {
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
  }

  stopDeviceDiscovery(): void {
    console.log('[LedgerBluetoothAdapter] stopDeviceDiscovery called');

    if (this.#scanSubscription) {
      this.#scanSubscription.unsubscribe();
      this.#scanSubscription = null;
      getDmk().stopDiscovering().catch((e: unknown) => {
        console.log('[DMK] stopDiscovering error (ignored):', e);
      });
    }

    if (this.#scanTimeoutId) {
      clearTimeout(this.#scanTimeoutId);
      this.#scanTimeoutId = null;
    }
  }

  async ensurePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    const version = Number(getSystemVersion()) || 0;

    if (version >= 12) {
      const result = await requestMultiple([
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      ]);
      const allGranted =
        result[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] === RESULTS.GRANTED &&
        result[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] === RESULTS.GRANTED;

      if (!allGranted) {
        await Linking.openSettings();
        return false;
      }
    } else {
      const result = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      if (result !== RESULTS.GRANTED) {
        await Linking.openSettings();
        return false;
      }
    }

    return true;
  }

  async isTransportAvailable(): Promise<boolean> {
    // Wait for initial BLE state if not yet received
    if (!this.#hasReceivedInitialBleState) {
      console.log(
        '[LedgerBluetoothAdapter] Waiting for initial BLE state...',
      );
      await this.#initialBleStatePromise;
      console.log(
        '[LedgerBluetoothAdapter] Initial BLE state received:',
        this.#isBluetoothOn,
      );
    }
    return this.#isBluetoothOn;
  }

  onTransportStateChange(callback: (isAvailable: boolean) => void): () => void {
    this.#transportStateCallbacks.add(callback);

    callback(this.#isBluetoothOn);

    return () => {
      this.#transportStateCallbacks.delete(callback);
    };
  }

  getRequiredAppName(): string {
    return 'Ethereum';
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
  async ensureDeviceReady(deviceId: string): Promise<boolean> {
    if (this.#isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }

    console.log(
      '[LedgerBluetoothAdapter] ensureDeviceReady called for:',
      deviceId,
    );

    // Retry on transient BLE errors (e.g., device switching apps)
    for (let attempt = 1; attempt <= MAX_DISCONNECT_RETRIES; attempt++) {
      try {
        return await this.#doEnsureDeviceReady(deviceId);
      } catch (error) {
        if (
          this.#isTransientBleError(error) &&
          attempt < MAX_DISCONNECT_RETRIES
        ) {
          console.log(
            `[LedgerBluetoothAdapter] Transient BLE error during check (attempt ${attempt}/${MAX_DISCONNECT_RETRIES}), retrying...`,
          );
    await this.#closeSession('disconnect');
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
  async #doEnsureDeviceReady(deviceId: string): Promise<boolean> {
    if (!this.isConnected() || this.#deviceId !== deviceId) {
      console.log('[LedgerBluetoothAdapter] Connecting first...');
      await this.connect(deviceId);
    }

    if (!this.#sessionId) {
      console.log('[LedgerBluetoothAdapter] No session after connect');
      return false;
    }

    try {
      console.log('[LedgerBluetoothAdapter] Checking app...');
      const abortController = new AbortController();
      const currentAppName = await this.#withTimeout(
        connectLedgerHardware(
          this.#sessionId,
          deviceId,
          abortController.signal,
        ),
        LEDGER_OPERATION_TIMEOUT_MS,
        'Device unresponsive',
        () => {
          abortController.abort();
          return this.#closeSession('handleWrongApp');
        },
      );
      console.log('[LedgerBluetoothAdapter] Got app name:', currentAppName);

      if (currentAppName === 'Ethereum') {
        console.log('[LedgerBluetoothAdapter] Ethereum app confirmed, verifying unlocked...');
        const verified = await this.#verifyEthereumAppUnlocked();
        console.log('[LedgerBluetoothAdapter] Verification result:', verified);
        return verified;
      }

      await this.#handleWrongApp(currentAppName);
      return false;
    } catch (error) {
      console.log(
        '[LedgerBluetoothAdapter] doEnsureDeviceReady error:',
        error,
      );

      if (this.#isDeviceLocked(error)) {
        this.#emitEvent({
          event: DeviceEvent.DeviceLocked,
          error: this.#toError(error),
        });
      }

      throw error;
    }
  }

  /**
   * Verify the Ethereum app is unlocked by requesting an address.
   * Rethrows transient BLE errors to allow retry in ensureDeviceReady.
   */
  async #verifyEthereumAppUnlocked(): Promise<boolean> {
    console.log(
      '[LedgerBluetoothAdapter] Ethereum app detected, verifying unlocked...',
    );

    try {
      if (!this.#sessionId) {
        throw new Error('No active session');
      }

      const dmk = getDmk();
      console.log('[DMK] #verifyEthereumAppUnlocked - checking session state for:', this.#sessionId);
      const state = await this.#withTimeout(
        firstValueFrom(dmk.getDeviceSessionState({ sessionId: this.#sessionId })),
        LEDGER_OPERATION_TIMEOUT_MS,
        'Device unresponsive during verification',
        () => this.#closeSession('timeout'),
      );

      console.log('[DMK] #verifyEthereumAppUnlocked - state:', JSON.stringify(state));

      if (state.deviceStatus === 'LOCKED') {
        console.log('[DMK] #verifyEthereumAppUnlocked - device is LOCKED');
        console.log('[LedgerBluetoothAdapter] Device is locked');
        this.#emitEvent({
          event: DeviceEvent.DeviceLocked,
          error: new Error('Device is locked'),
        });
        return false;
      }

      console.log('[LedgerBluetoothAdapter] Device verified unlocked!');

      this.#emitEvent({
        event: DeviceEvent.AppOpened,
        currentAppName: 'Ethereum',
      });
      return true;
    } catch (verifyError) {
      console.log(
        '[LedgerBluetoothAdapter] Verification failed:',
        verifyError,
      );

      if (this.#isTransientBleError(verifyError)) {
        throw verifyError;
      }

      if (this.#isDeviceLocked(verifyError)) {
        console.log('[LedgerBluetoothAdapter] Device is locked');
        this.#emitEvent({
          event: DeviceEvent.DeviceLocked,
          error: this.#toError(verifyError),
        });
      }
      return false;
    }
  }

  /**
   * Handle wrong app or BOLOS screen: emit AppNotOpen and attempt app switch.
   */
  async #handleWrongApp(appName: string): Promise<void> {
    console.log(
      '[LedgerBluetoothAdapter] Wrong app or BOLOS:',
      appName,
      '- user needs to open Ethereum app',
    );

    this.#emitEvent({
      event: DeviceEvent.AppNotOpen,
      currentAppName: 'Ethereum',
    });

    if (appName === 'BOLOS') {
      try {
        console.log(
          '[LedgerBluetoothAdapter] Requesting Ethereum app to open...',
        );
        await this.#withTimeout(
          openEthereumAppOnLedger(),
          LEDGER_OPERATION_TIMEOUT_MS,
          'Device unresponsive while opening Ethereum app',
          () => this.#closeSession('timeout'),
        );
        console.log('[LedgerBluetoothAdapter] Open app command sent');
      } catch (openError) {
        console.log(
          '[LedgerBluetoothAdapter] Failed to send open app command:',
          openError,
        );
        await this.#closeSession('handleWrongApp-error');
      }
    } else {
      try {
        console.log('[LedgerBluetoothAdapter] Closing wrong app:', appName);
        await this.#withTimeout(
          closeRunningAppOnLedger(),
          LEDGER_OPERATION_TIMEOUT_MS,
          'Device unresponsive while closing current app',
          () => this.#closeSession('timeout'),
        );
        console.log('[LedgerBluetoothAdapter] Close app command sent');
      } catch (closeError) {
        console.log(
          '[LedgerBluetoothAdapter] Failed to close app:',
          closeError,
        );
        await this.#closeSession('closeApp-error');
      }
    }
  }

  destroy(): void {
    this.#isDestroyed = true;
    this.#stopBluetoothMonitoring();
    this.#resolveInitialBleStateIfPending();
    this.stopDeviceDiscovery();
    this.#transportStateCallbacks.clear();

    void this.#closeSession('destroy');
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
    console.log('[DMK] #handleDisconnect - clearing session');
    this.#sessionId = null;
    this.#sessionStateSubscription?.unsubscribe();
    this.#sessionStateSubscription = null;
    console.log(
      '[LedgerBluetoothAdapter] handleDisconnect - session cleared',
    );
  }

  #emitEvent(payload: DeviceEventPayload): void {
    this.#options.onDeviceEvent(payload);
  }

  async #closeSession(reason?: string): Promise<void> {
    const sessionId = this.#sessionId;
    const deviceId = this.#deviceId;
    this.#sessionId = null;
    this.#sessionStateSubscription?.unsubscribe();
    this.#sessionStateSubscription = null;
    console.log('[DMK] #closeSession - closing session:', sessionId, 'device:', deviceId, 'reason:', reason ?? 'unknown');

    try {
      if (sessionId) {
        await getDmk().disconnect({ sessionId });
        console.log('[DMK] #closeSession - disconnected session:', sessionId);
      }
    } catch (error) {
      console.log('[DMK] #closeSession - disconnect error (expected if device gone):', error);
    }
  }

  #clearTransportState(): void {
    this.#sessionId = null;
    this.#deviceId = null;
  }

  async #cleanupStaleConnections(): Promise<void> {
    const dmk = getDmk();

    try {
      const connected = dmk.listConnectedDevices();
      console.log(
        '[DMK] #cleanupStaleConnections - DMK connected devices:',
        connected.length,
        connected.map((d: { id: string; name: string }) => `${d.name}(${d.id})`),
      );
      for (const device of connected) {
        console.log('[DMK] #cleanupStaleConnections - disconnecting DMK session:', (device as { sessionId: string }).sessionId);
        try {
          await dmk.disconnect({ sessionId: (device as { sessionId: string }).sessionId });
        } catch (e) {
          console.log('[DMK] #cleanupStaleConnections - DMK disconnect error:', e);
        }
      }
    } catch (e) {
      console.log('[DMK] #cleanupStaleConnections - listConnectedDevices error:', e);
    }
  }

  /**
   * Resolve the initial BLE state promise if still pending.
   */
  #resolveInitialBleStateIfPending(): void {
    this.#hasReceivedInitialBleState = true;
    if (this.#resolveInitialBleState) {
      this.#resolveInitialBleState();
      this.#resolveInitialBleState = null;
    }
  }

  #startBluetoothMonitoring(): void {
    console.log('[LedgerBluetoothAdapter] Starting Bluetooth monitoring');

    this.#bleStateSubscription = TransportBLE.observeState({
      next: (event) => {
        const wasOn = this.#isBluetoothOn;
        const isFirstState = !this.#hasReceivedInitialBleState;

        // Compare as string to avoid BleState type issues
        this.#isBluetoothOn =
          event.available && event.type === BleState.PoweredOn;

        console.log(
          '[LedgerBluetoothAdapter] BLE state:',
          event.type,
          'available:',
          event.available,
          '-> isBluetoothOn:',
          this.#isBluetoothOn,
        );

        // Resolve initial state promise on first update
        if (isFirstState) {
          this.#resolveInitialBleStateIfPending();
        }

        // Notify listeners if state changed (or on first state)
        if (wasOn !== this.#isBluetoothOn || isFirstState) {
          this.#notifyTransportStateChange();
        }
      },
      error: (error: Error) => {
        console.log('[LedgerBluetoothAdapter] BLE state error:', error);
        this.#isBluetoothOn = false;

        // Also resolve initial state promise on error
        if (!this.#hasReceivedInitialBleState) {
          this.#resolveInitialBleStateIfPending();
        }

        this.#notifyTransportStateChange();
      },
      complete: () => undefined,
    });
  }

  #stopBluetoothMonitoring(): void {
    if (this.#bleStateSubscription) {
      this.#bleStateSubscription.unsubscribe();
      this.#bleStateSubscription = null;
    }
  }

  #notifyTransportStateChange(): void {
    for (const callback of this.#transportStateCallbacks) {
      try {
        callback(this.#isBluetoothOn);
      } catch (error) {
        console.log(
          '[LedgerBluetoothAdapter] Error in transport state callback:',
          error,
        );
      }
    }
  }

  /**
   * Check if error is a transient BLE error that can be retried
   * (disconnects during app switch, pairing failures during reconnect, etc.)
   *
   * Checks error name first, then falls back to message-based detection
   * for BLE errors that use generic Error names after a device power-cycle.
   */
  #isTransientBleError(error: unknown): boolean {
    if (!(error instanceof Object)) return false;

    const err = error as { _tag?: string; originalError?: { name?: string }; message?: string };

    const transientDmkTags: readonly string[] = [
      'ConnectionOpeningError',
      'DeviceDisconnectedWhileSendingError',
      'DeviceDisconnectedBeforeSendingApdu',
      'DeviceSessionNotFound',
    ];
    if (err._tag && transientDmkTags.includes(err._tag)) return true;

    const rawError = err.originalError;
    if (rawError?.name) {
      const transientBleErrorNames: readonly string[] = [
        ...DISCONNECT_ERROR_NAMES,
        'PairingFailed',
        'PeerRemovedPairing',
        'BleError',
      ];
      if (transientBleErrorNames.includes(rawError.name)) return true;
    }

    const message = err.message?.toLowerCase() ?? '';
    return (
      message.includes('disconnected') ||
      message.includes('connection lost') ||
      message.includes('gatt') ||
      message.includes('ble error') ||
      message.includes('bluetooth connection') ||
      message.includes('bluetooth transfer')
    );
  }

  /**
   * Check if error indicates device is locked
   */
  #isDeviceLocked(error: unknown): boolean {
    if (error === null || error === undefined) {
      return false;
    }

    const err = error as {
      _tag?: string;
      name?: string;
      statusCode?: number;
      message?: string;
    };

    if (err._tag === 'DeviceLockedError') return true;

    if (err.name === 'TransportStatusError') {
      return err.statusCode === DEVICE_LOCKED_STATUS_CODE;
    }

    if (typeof err.message === 'string' && err.message.includes('Locked device')) {
      return true;
    }
    return false;
  }

  /**
   * Add timeout to an async operation. Clears the timer when the main promise settles first.
   */
  #withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
    onTimeout?: () => void | Promise<void>,
  ): Promise<T> {
    const timeoutError = new Error(errorMessage);
    timeoutError.name = 'LedgerTimeoutError';

    let timeoutId: ReturnType<typeof setTimeout>;
    let timedOut = false;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(timeoutError);
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
      if (!timedOut || !onTimeout) {
        return;
      }

      return Promise.resolve(onTimeout()).catch(() => undefined);
    });
  }

  /**
   * Normalize unknown value to Error for event/callback payloads.
   */
  #toError(value: unknown): Error {
    return value instanceof Error ? value : new Error(String(value));
  }
}
