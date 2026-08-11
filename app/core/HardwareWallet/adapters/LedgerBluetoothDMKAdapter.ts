import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import { State as BleState } from 'react-native-ble-plx';
import { Linking, Platform } from 'react-native';
import {
  type Observable,
  Subscription,
  distinctUntilChanged,
  debounceTime,
} from 'rxjs';
import {
  DeviceLockedError,
  type DiscoveredDevice as DmkDiscoveredDevice,
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
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
} from '../../Ledger/Ledger';
import {
  connectLedgerDmkHardware,
  connectLedgerDmkDevice,
  getLedgerDmkSessionState,
  disconnectLedgerDmkSession,
  listenToLedgerDmkAvailableDevices,
} from '../../Ledger/LedgerDmk';
import { DISCONNECT_ERROR_NAMES } from '../../Ledger/ledgerErrors';

const DEVICE_LOCKED_STATUS_CODE = 0x6b0c;
const LEDGER_OPERATION_TIMEOUT_MS = 10000;
const DEFAULT_SCAN_TIMEOUT_MS = 30000;
const MAX_DISCONNECT_RETRIES = 3;
const CONNECT_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

/**
 * Adapter for Ledger hardware wallets using Bluetooth Low Energy (BLE).
 *
 * This adapter encapsulates all BLE transport logic for communicating with
 * Ledger devices. It implements the HardwareWalletAdapter interface to provide
 * a unified API for the hardware wallet context.
 */

export class LedgerBluetoothDMKAdapter implements HardwareWalletAdapter {
  readonly walletType = HardwareWalletType.Ledger;
  readonly requiresDeviceDiscovery = true;

  #sessionId: string | null = null;
  #sessionConnected = false;
  #deviceId: string | null = null;
  readonly #options: HardwareWalletAdapterOptions;
  #isDestroyed = false;
  #backgroundReconnectInFlight: Promise<boolean> | null = null;
  #lastConnectedDevice: DmkDiscoveredDevice | null = null;
  #connectInFlight: Promise<void> | null = null;
  #flowComplete = false;
  #isBluetoothOn = false;
  #hasReceivedInitialBleState = false;
  readonly #initialBleStatePromise: Promise<void>;
  #resolveInitialBleState: (() => void) | null = null;
  #bleStateSubscription: { unsubscribe: () => void } | null = null;
  #scanSubscription: Subscription | null = null;
  #scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
  /** Bumped by {@link stopDeviceDiscovery} to cancel an in-flight async start. */
  #discoveryEpoch = 0;
  readonly #transportStateCallbacks: Set<(isAvailable: boolean) => void> =
    new Set();
  readonly #discoveredDevices: Map<string, DmkDiscoveredDevice> = new Map();
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
      if (
        this.#sessionId &&
        this.#deviceId === deviceId &&
        this.#sessionConnected
      )
        return;
      if (this.#isDestroyed) throw new Error('Adapter has been destroyed');
    }

    if (
      this.#sessionId &&
      this.#deviceId === deviceId &&
      this.#sessionConnected
    ) {
      return;
    }

    if (this.#sessionId) {
      await this.disconnect();
    }

    this.stopDeviceDiscovery();

    this.#connectInFlight = this.#doConnect(deviceId);
    try {
      await this.#connectInFlight;
    } finally {
      this.#connectInFlight = null;
    }
  }

  async backgroundReconnect(
    targetDeviceId: string,
    timeoutMs = 10000,
  ): Promise<boolean> {
    if (this.#isDestroyed) return false;

    if (this.#backgroundReconnectInFlight) {
      return this.#backgroundReconnectInFlight;
    }

    this.#backgroundReconnectInFlight = this.#doBackgroundReconnect(
      targetDeviceId,
      timeoutMs,
    );

    try {
      return await this.#backgroundReconnectInFlight;
    } finally {
      this.#backgroundReconnectInFlight = null;
    }
  }

  async #doBackgroundReconnect(
    targetDeviceId: string,
    timeoutMs: number,
  ): Promise<boolean> {
    // Strategy 1: Direct connect using cached device info (no scan).
    // The bridge's connect() only uses device.id + transport.
    if (
      this.#lastConnectedDevice &&
      this.#lastConnectedDevice.id === targetDeviceId
    ) {
      try {
        const sessionId = await connectLedgerDmkDevice(
          this.#lastConnectedDevice,
        );
        if (this.#isDestroyed) {
          try {
            await disconnectLedgerDmkSession();
          } catch {
            /* ignore */
          }
          return false;
        }

        this.#sessionId = sessionId;
        this.#sessionConnected = true;
        this.#deviceId = targetDeviceId;

        void this.#startSessionMonitoring();
        this.#emitEvent({
          event: DeviceEvent.Connected,
          deviceId: targetDeviceId,
        });
        return true;
      } catch {
        // Direct connect failed; fall back to scan below.
      }
    }

    // Strategy 2: Scan for the device (fallback).

    try {
      const devices$ = await listenToLedgerDmkAvailableDevices({});
      const discovered = await new Promise<DmkDiscoveredDevice | null>(
        (resolve) => {
          let sub: Subscription | null = null;
          const timer = setTimeout(() => {
            sub?.unsubscribe();
            resolve(null);
          }, timeoutMs);

          // Discovery uses the bridge's shared DMK: listenToAvailableDevices
          // lists already-paired/known devices instantly, which
          // startDiscovering (active scan) does not.
          sub = devices$.subscribe({
            next: (devices: DmkDiscoveredDevice[]) => {
              for (const candidate of devices) {
                if (candidate.id === targetDeviceId) {
                  clearTimeout(timer);
                  sub?.unsubscribe();
                  resolve(candidate);
                  return;
                }
              }
            },
            error: () => {
              clearTimeout(timer);
              resolve(null);
            },
          });
        },
      );

      if (!discovered) {
        return false;
      }

      this.#discoveredDevices.set(targetDeviceId, discovered);
      this.#lastConnectedDevice = discovered;

      await this.connect(targetDeviceId);
      return true;
    } catch {
      return false;
    }
  }

  async #doConnect(deviceId: string): Promise<void> {
    const discoveredDevice = this.#discoveredDevices.get(deviceId);
    if (!discoveredDevice) {
      this.#clearTransportState();
      this.#emitEvent({
        event: DeviceEvent.ConnectionFailed,
        error: new Error(
          `No cached DiscoveredDevice for deviceId: ${deviceId}`,
        ),
      });
      return;
    }

    let lastError: unknown;

    for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
      try {
        const sessionId = await connectLedgerDmkDevice(discoveredDevice);

        if (this.#isDestroyed) {
          try {
            await disconnectLedgerDmkSession();
          } catch {
            // Ignore
          }
          return;
        }

        this.#sessionId = sessionId;
        this.#sessionConnected = true;
        this.#deviceId = deviceId;
        this.#lastConnectedDevice = discoveredDevice;

        void this.#startSessionMonitoring();

        this.#emitEvent({
          event: DeviceEvent.Connected,
          deviceId,
        });
        return;
      } catch (error) {
        lastError = error;
        if (attempt < CONNECT_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    this.#clearTransportState();

    this.#emitEvent({
      event: DeviceEvent.ConnectionFailed,
      error: this.#toError(lastError),
    });

    throw lastError;
  }

  async #startSessionMonitoring(): Promise<void> {
    this.#sessionStateSubscription?.unsubscribe();

    let sessionState$: Observable<{ connected: boolean }>;
    try {
      sessionState$ = await getLedgerDmkSessionState();
    } catch {
      return;
    }

    this.#sessionStateSubscription = sessionState$
      .pipe(
        distinctUntilChanged(
          (a: { connected: boolean }, b: { connected: boolean }) =>
            a.connected === b.connected,
        ),
        debounceTime(3000),
      )
      .subscribe({
        next: (state: { connected: boolean }) => {
          this.#sessionConnected = state.connected;
          if (!state.connected) {
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
    await this.#closeSession('disconnect', true);
    this.#clearTransportState();

    if (previousDeviceId && !this.#flowComplete) {
      this.#emitEvent({
        event: DeviceEvent.Disconnected,
        deviceId: previousDeviceId,
      });
    }
  }

  /**
   * Reset the adapter for a fresh connection attempt.
   *
   * Clears only the flow-complete flag — the DMK session is preserved for
   * reuse across flows. Only a device switch (`disconnect`) or adapter
   * teardown (`destroy`) releases the session. Does NOT emit
   * DeviceEvent.Disconnected.
   *
   * {@link resetFlowState} is equivalent (clears the flow-complete flag,
   * preserves the session) — use between two operations on the same
   * connection.
   */
  reset(): void {
    this.#flowComplete = false;
  }

  markFlowComplete(): void {
    this.#flowComplete = true;
  }

  isFlowComplete(): boolean {
    return this.#flowComplete;
  }

  /**
   * Clear only the flow-complete flag, leaving the session intact.
   *
   * Use between successive operations on the same connection so that errors
   * are surfaced again. To fully reset state (including the session), use
   * {@link reset} instead.
   */
  resetFlowState(): void {
    this.#flowComplete = false;
  }

  getConnectedDeviceId(): string | null {
    return this.#deviceId;
  }

  isConnected(): boolean {
    return this.#sessionId !== null && this.#sessionConnected;
  }

  startDeviceDiscovery(
    onDeviceFound: (device: DiscoveredDevice) => void,
    onError: (error: Error) => void,
  ): () => void {
    if (this.#isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }

    this.stopDeviceDiscovery();

    this.#startDiscoveryInner(onDeviceFound, onError).catch((error) => {
      onError(error instanceof Error ? error : new Error(String(error)));
    });

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

    this.stopDeviceDiscovery();

    const seenDevices = new Set<string>();
    const discoveryEpoch = this.#discoveryEpoch;

    // Discovery uses the bridge's shared DMK: listenToAvailableDevices lists
    // paired/known devices (incl. already-connected ones), which
    // startDiscovering (active scan) does not surface.
    const devices$ = await listenToLedgerDmkAvailableDevices({});
    if (this.#isDestroyed || discoveryEpoch !== this.#discoveryEpoch) {
      return;
    }

    this.#scanSubscription = devices$.subscribe({
      next: (devices: DmkDiscoveredDevice[]) => {
        for (const discoveredDevice of devices) {
          if (!seenDevices.has(discoveredDevice.id)) {
            seenDevices.add(discoveredDevice.id);
            this.#discoveredDevices.set(discoveredDevice.id, discoveredDevice);
            const discoveredDev: DiscoveredDevice = {
              id: discoveredDevice.id,
              name: discoveredDevice.name || 'Unknown Device',
            };
            onDeviceFound(discoveredDev);
          }
        }
      },
      error: (error: Error) => {
        this.stopDeviceDiscovery();
        onError(error);
      },
    });

    this.#scanTimeoutId = setTimeout(() => {
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
    this.#discoveryEpoch += 1;

    if (this.#scanSubscription) {
      this.#scanSubscription.unsubscribe();
      this.#scanSubscription = null;
      // Unsubscribing stops event delivery. The underlying DMK listen may
      // persist until the shared kit tears down.
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

    // getSystemVersion() returns the Android version string (e.g. "12", "13",
    // "14.1"). Coercing via Number() gives a numeric major version we can
    // compare against 12 (the API 31 split where BLUETOOTH_CONNECT/SCAN
    // replaced ACCESS_FINE_LOCATION for BLE).
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
      await this.#initialBleStatePromise;
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

    // Retry on transient BLE errors (e.g., device switching apps).
    // Every iteration either returns from #doEnsureDeviceReady or throws,
    // so the loop is guaranteed to exit before reaching the end.
    for (let attempt = 1; attempt <= MAX_DISCONNECT_RETRIES; attempt++) {
      try {
        return await this.#doEnsureDeviceReady(deviceId);
      } catch (error) {
        if (
          this.#isTransientBleError(error) &&
          attempt < MAX_DISCONNECT_RETRIES
        ) {
          if (this.#isSessionLost(error)) {
            // Session is gone — force a fresh connect on the next attempt.
            // No destroy: bridge.connect() replaces the prior managed session.
            this.#sessionId = null;
            this.#sessionConnected = false;
          }
          // else: transient hiccup on a still-alive session — keep it for reuse.
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }

        // Non-transient error or max retries reached
        throw error;
      }
    }

    // Unreachable: the loop above always returns or throws. Throw explicitly
    // to satisfy the type checker and guard against future logic changes.
    throw new Error('ensureDeviceReady: retry loop exited unexpectedly');
  }

  /** Internal readiness check, called by ensureDeviceReady's retry loop. */
  async #doEnsureDeviceReady(deviceId: string): Promise<boolean> {
    if (!this.isConnected() || this.#deviceId !== deviceId) {
      await this.connect(deviceId);
    }

    if (!this.#sessionId) {
      return false;
    }

    try {
      const abortController = new AbortController();
      const currentAppName = await this.#withTimeout(
        connectLedgerDmkHardware(
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

      if (currentAppName === 'Ethereum') {
        const verified = await this.#verifyEthereumAppUnlocked();
        return verified;
      }

      await this.#handleWrongApp(currentAppName);
      return false;
    } catch (error) {
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
    // The bridge's session-state stream only exposes `{ connected }` (no
    // LOCKED granularity), so a locked device cannot be pre-detected here. It
    // is instead surfaced via `DeviceLockedError` on the next operation,
    // caught by `#isDeviceLocked` in the callers.

    this.#emitEvent({
      event: DeviceEvent.AppOpened,
      currentAppName: 'Ethereum',
    });
    return true;
  }

  /**
   * Handle wrong app or BOLOS screen: emit AppNotOpen and attempt app switch.
   */
  async #handleWrongApp(appName: string): Promise<void> {
    this.#emitEvent({
      event: DeviceEvent.AppNotOpen,
      currentAppName: 'Ethereum',
    });

    if (appName === 'BOLOS') {
      try {
        await this.#withTimeout(
          openEthereumAppOnLedger(),
          LEDGER_OPERATION_TIMEOUT_MS,
          'Device unresponsive while opening Ethereum app',
          () => this.#closeSession('timeout'),
        );
      } catch {
        await this.#closeSession('handleWrongApp-error');
      }
    } else {
      try {
        await this.#withTimeout(
          closeRunningAppOnLedger(),
          LEDGER_OPERATION_TIMEOUT_MS,
          'Device unresponsive while closing current app',
          () => this.#closeSession('timeout'),
        );
      } catch {
        await this.#closeSession('closeApp-error');
      }
    }
  }

  /**
   * Tear down the adapter: stop BLE monitoring, close the DMK session, and
   * release native resources. Called when the adapter is being discarded
   * (provider unmount, wallet-type change).
   *
   * `#isDestroyed` is set synchronously so any subsequent (or in-flight)
   * `connect()` / `backgroundReconnect()` / `ensureDeviceReady()` call
   * rejects fast. The DMK session close happens asynchronously without
   * awaiting — by design, since the caller (typically React unmount) cannot
   * await — so callers that need a guaranteed close should call
   * `disconnect()` first.
   */
  destroy(): void {
    this.#isDestroyed = true;
    this.#stopBluetoothMonitoring();
    this.#resolveInitialBleStateIfPending();
    this.stopDeviceDiscovery();
    this.#transportStateCallbacks.clear();

    this.#closeSession('destroy', true).catch(() => undefined);
  }

  /**
   * Handle disconnect events from the transport.
   *
   * Clears the session reference but preserves deviceId for reconnection.
   * Does NOT emit DeviceEvent.Disconnected — disconnect event emission is
   * consolidated in `disconnect()`. Transport-driven drops are surfaced via
   * ensureDeviceReady's retry loop, which catches the resulting errors and
   * retries automatically. This avoids false-positive error UI from transient
   * BLE disconnects (e.g. Ledger app switching).
   */
  #handleDisconnect(): void {
    this.#sessionId = null;
    this.#sessionConnected = false;
    this.#sessionStateSubscription?.unsubscribe();
    this.#sessionStateSubscription = null;
  }

  /**
   * Whether an error indicates the DMK session is gone (vs. a transient
   * hiccup on a still-alive session). Session-lost errors force a fresh
   * `connect()` on the next attempt; transient hiccups reuse the session.
   */
  #isSessionLost(error: unknown): boolean {
    if (error === null || typeof error !== 'object') return false;
    const tag = (error as { _tag?: string })._tag;
    return (
      tag === 'DeviceSessionNotFound' ||
      tag === 'DeviceDisconnectedWhileSendingError' ||
      tag === 'DeviceDisconnectedBeforeSendingApdu'
    );
  }

  #emitEvent(payload: DeviceEventPayload): void {
    this.#options.onDeviceEvent(payload);
  }

  /**
   * Release the current session.
   *
   * - `hard` (`disconnect`/`destroy` only): drops the bridge session entirely
   * via `bridge.destroy()`, clearing the signer cache and BLE connection.
   * Reserved for genuine teardown (device switch, adapter discard).
   * - soft (default): no-op on the session — keeps the bridge session and
   * signer cache for reuse across operations/retries. Real BLE drops are
   * detected by the session-state monitor (`#handleDisconnect`), the
   * authority for clearing `#sessionId`.
   */
  async #closeSession(reason?: string, hard = false): Promise<void> {
    const sessionId = this.#sessionId;
    const deviceId = this.#deviceId;

    if (!hard) {
      return;
    }

    this.#sessionId = null;
    this.#sessionConnected = false;
    this.#sessionStateSubscription?.unsubscribe();
    this.#sessionStateSubscription = null;

    try {
      if (sessionId) {
        await disconnectLedgerDmkSession();
      }
    } catch {
      // Session cleanup is best-effort.
    }
  }

  #clearTransportState(): void {
    this.#sessionId = null;
    this.#deviceId = null;
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
    this.#bleStateSubscription = TransportBLE.observeState({
      next: (event) => {
        const wasOn = this.#isBluetoothOn;
        const isFirstState = !this.#hasReceivedInitialBleState;

        // Compare as string to avoid BleState type issues
        this.#isBluetoothOn =
          event.available && event.type === BleState.PoweredOn;

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
      } catch {
        // Listener errors are ignored.
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
    if (error === null || typeof error !== 'object') return false;

    const err = error as {
      _tag?: string;
      originalError?: { name?: string };
      message?: string;
    };

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
    // Primary signal: DMK's own DeviceLockedError class.
    if (error instanceof DeviceLockedError) return true;

    if (error === null || error === undefined) {
      return false;
    }

    const err = error as {
      name?: string;
      statusCode?: number;
      message?: string;
    };

    // Legacy fallbacks for non-DMK error sources (e.g. @ledgerhq/errors
    // TransportStatusError thrown by connectLedgerHardware /
    // openEthereumAppOnLedger / closeRunningAppOnLedger).
    if (err.name === 'TransportStatusError') {
      return err.statusCode === DEVICE_LOCKED_STATUS_CODE;
    }

    if (
      typeof err.message === 'string' &&
      err.message.includes('Locked device')
    ) {
      return true;
    }
    return false;
  }

  /**
   * Add timeout to an async operation.
   *
   * If `onTimeout` is provided, it is awaited after the timeout fires so the
   * caller can do cleanup (e.g., close the session). The timer is cleared as
   * soon as the main promise settles (success or failure).
   */
  #withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
    onTimeout?: () => void | Promise<void>,
  ): Promise<T> {
    const timeoutError = new Error(errorMessage);
    timeoutError.name = 'LedgerTimeoutError';

    let timedOut = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(timeoutError);
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
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
