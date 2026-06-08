import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import { State as BleState } from 'react-native-ble-plx';
import { Linking, Platform } from 'react-native';
import {
  Subscription,
  firstValueFrom,
  distinctUntilChanged,
  debounceTime,
} from 'rxjs';
import DevLogger from '../../SDKConnect/utils/DevLogger';
import type {
  DiscoveredDevice as DmkDiscoveredDevice,
  DeviceSessionState,
  ConnectedDevice,
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
  #deviceId: string | null = null;
  get deviceId(): string | null {
    return this.#deviceId;
  }
  #options: HardwareWalletAdapterOptions;
  #isDestroyed = false;
  #backgroundReconnectInFlight: Promise<boolean> | null = null;
  #lastConnectedDevice: DmkDiscoveredDevice | null = null;
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
      DevLogger.log(
        '[LedgerDMK] backgroundReconnect - already in flight, reusing',
      );
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
    const dmk = getDmk();

    // Strategy 1: Direct connect using cached device info (no scan).
    // DMK's connect() only uses device.id + device.transport → BleManager.connectToDevice().
    if (
      this.#lastConnectedDevice &&
      this.#lastConnectedDevice.id === targetDeviceId
    ) {
      DevLogger.log(
        '[LedgerDMK] backgroundReconnect - attempting direct connect (no scan) for:',
        targetDeviceId,
      );
      try {
        const sessionId = await dmk.connect({
          device: this.#lastConnectedDevice,
        });
        if (this.#isDestroyed) {
          try {
            await dmk.disconnect({ sessionId });
          } catch {
            /* ignore */
          }
          return false;
        }

        this.#sessionId = sessionId;
        this.#deviceId = targetDeviceId;

        try {
          dmk.disableDeviceSessionRefresher({ sessionId });
        } catch {
          /* ignore */
        }

        this.#startSessionMonitoring(sessionId);
        this.#emitEvent({
          event: DeviceEvent.Connected,
          deviceId: targetDeviceId,
        });
        DevLogger.log(
          '[LedgerDMK] backgroundReconnect - direct connect succeeded, sessionId:',
          sessionId,
        );
        return true;
      } catch (error) {
        DevLogger.log(
          '[LedgerDMK] backgroundReconnect - direct connect failed, falling back to scan:',
          error,
        );
      }
    }

    // Strategy 2: Scan for the device (fallback).
    DevLogger.log(
      '[LedgerDMK] backgroundReconnect - scanning for:',
      targetDeviceId,
      'timeout:',
      timeoutMs,
    );

    try {
      const discovered = await new Promise<DmkDiscoveredDevice | null>(
        (resolve) => {
          let sub: Subscription | null = null;
          const timer = setTimeout(() => {
            sub?.unsubscribe();
            resolve(null);
          }, timeoutMs);

          sub = dmk.listenToAvailableDevices({}).subscribe({
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
        DevLogger.log(
          '[LedgerDMK] backgroundReconnect - device not found within timeout',
        );
        return false;
      }

      this.#discoveredDevices.set(targetDeviceId, discovered);
      this.#lastConnectedDevice = discovered;
      DevLogger.log(
        '[LedgerDMK] backgroundReconnect - device found, connecting',
      );

      await this.connect(targetDeviceId);
      return true;
    } catch (error) {
      DevLogger.log('[LedgerDMK] backgroundReconnect - error:', error);
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

    const dmk = getDmk();
    await this.#cleanupStaleConnections();
    let lastError: unknown;

    for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
      try {
        DevLogger.log(
          '[LedgerDMK] #doConnect - attempt',
          attempt,
          'for device:',
          deviceId,
        );
        const sessionId = await dmk.connect({ device: discoveredDevice });
        DevLogger.log('[LedgerDMK] #doConnect - got sessionId:', sessionId);

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
        this.#lastConnectedDevice = discoveredDevice;

        try {
          dmk.disableDeviceSessionRefresher({ sessionId });
          DevLogger.log('[LedgerDMK] #doConnect - session refresher disabled');
        } catch (e) {
          DevLogger.log(
            '[LedgerDMK] #doConnect - disableDeviceSessionRefresher error:',
            e,
          );
        }

        this.#startSessionMonitoring(sessionId);

        this.#emitEvent({
          event: DeviceEvent.Connected,
          deviceId,
        });
        return;
      } catch (error) {
        lastError = error;
        DevLogger.log(
          '[LedgerDMK] #doConnect - attempt',
          attempt,
          'failed:',
          JSON.stringify({
            message: error instanceof Error ? error.message : String(error),
            name: error instanceof Error ? error.constructor?.name : undefined,
            _tag: (error as { _tag?: string })?._tag,
            originalError:
              (error as { originalError?: unknown })?.originalError instanceof
              Error
                ? {
                    message: (
                      (error as { originalError?: Error })
                        .originalError as Error
                    ).message,
                  }
                : undefined,
          }),
        );
        if (attempt < CONNECT_RETRIES) {
          DevLogger.log(
            '[LedgerDMK] #doConnect - retrying in',
            RETRY_DELAY_MS,
            'ms',
          );
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    DevLogger.log('[LedgerDMK] #doConnect - all attempts exhausted');
    this.#clearTransportState();

    this.#emitEvent({
      event: DeviceEvent.ConnectionFailed,
      error: this.#toError(lastError),
    });

    throw lastError;
  }

  #startSessionMonitoring(sessionId: string): void {
    this.#sessionStateSubscription?.unsubscribe();
    DevLogger.log(
      '[LedgerDMK] #startSessionMonitoring - subscribing to session state for:',
      sessionId,
    );

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
            DevLogger.log(
              '[LedgerDMK] #startSessionMonitoring - deviceStatus:',
              state.deviceStatus,
            );
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
    DevLogger.log('[LedgerDMK] disconnect() called');
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

  /**
   * Reset the adapter for a fresh connection attempt.
   *
   * Closes any active DMK session, clears transport state, and clears the
   * flow-complete flag. Use this when the user dismisses the device-selection
   * UI or starts a new flow. Does NOT emit DeviceEvent.Disconnected.
   *
   * In contrast, {@link resetFlowState} only clears the flow-complete flag
   * (preserving the session) — use it between two operations within the
   * same connection (e.g., after `markFlowComplete` has suppressed errors
   * for one operation and you want errors visible again for the next).
   */
  reset(): void {
    DevLogger.log('[LedgerDMK] Resetting adapter state');
    this.#flowComplete = false;
    this.#closeSession('reset').catch((error) => {
      DevLogger.log('[LedgerDMK] reset - closeSession error:', error);
    });
    this.#clearTransportState();
  }

  markFlowComplete(): void {
    DevLogger.log('[LedgerDMK] Marking flow as complete');
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
    DevLogger.log('[LedgerDMK] Resetting flow state');
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

    DevLogger.log('[LedgerDMK] startDeviceDiscovery called');

    this.stopDeviceDiscovery();

    this.#startDiscoveryInner(onDeviceFound, onError).catch((error) => {
      DevLogger.log('[LedgerDMK] startDiscoveryInner error:', error);
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

    this.stopDeviceDiscovery(); // TODO: rename to stopScanning()

    await this.#cleanupStaleConnections();

    const seenDevices = new Set<string>();

    DevLogger.log('[LedgerDMK] Starting DMK discovery');

    const dmk = getDmk();

    DevLogger.log(
      '[LedgerDMK] startDeviceDiscovery - calling dmk.listenToAvailableDevices()',
    );
    this.#scanSubscription = dmk.listenToAvailableDevices({}).subscribe({
      next: (devices: DmkDiscoveredDevice[]) => {
        DevLogger.log('[LedgerDMK] DMK scan batch:', devices.length, 'devices');
        for (const discoveredDevice of devices) {
          if (!seenDevices.has(discoveredDevice.id)) {
            seenDevices.add(discoveredDevice.id);
            this.#discoveredDevices.set(discoveredDevice.id, discoveredDevice);
            const discoveredDev: DiscoveredDevice = {
              id: discoveredDevice.id,
              name: discoveredDevice.name || 'Unknown Device',
            };
            DevLogger.log('[LedgerDMK] Found device:', discoveredDev.name);
            onDeviceFound(discoveredDev);
          }
        }
      },
      error: (error: Error) => {
        DevLogger.log('[LedgerDMK] DMK scan error:', error);
        this.stopDeviceDiscovery();
        onError(error);
      },
      complete: () => {
        DevLogger.log('[LedgerDMK] DMK scan completed');
      },
    });

    this.#scanTimeoutId = setTimeout(() => {
      DevLogger.log('[LedgerDMK] Scan timeout reached');
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
    DevLogger.log('[LedgerDMK] stopDeviceDiscovery called');

    if (this.#scanSubscription) {
      this.#scanSubscription.unsubscribe();
      this.#scanSubscription = null;
      getDmk()
        .stopDiscovering()
        .catch((e: unknown) => {
          DevLogger.log('[LedgerDMK] stopDiscovering error (ignored):', e);
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
      DevLogger.log('[LedgerDMK] Waiting for initial BLE state...');
      await this.#initialBleStatePromise;
      DevLogger.log(
        '[LedgerDMK] Initial BLE state received:',
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

    DevLogger.log('[LedgerDMK] ensureDeviceReady called for:', deviceId);

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
          DevLogger.log(
            `[LedgerDMK] Transient BLE error during check (attempt ${attempt}/${MAX_DISCONNECT_RETRIES}), retrying...`,
          );
          await this.#closeSession('disconnect');
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
      DevLogger.log('[LedgerDMK] Connecting first...');
      await this.connect(deviceId);
    }

    if (!this.#sessionId) {
      DevLogger.log('[LedgerDMK] No session after connect');
      return false;
    }

    try {
      DevLogger.log('[LedgerDMK] Checking app...');
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
      DevLogger.log('[LedgerDMK] Got app name:', currentAppName);

      if (currentAppName === 'Ethereum') {
        DevLogger.log(
          '[LedgerDMK] Ethereum app confirmed, verifying unlocked...',
        );
        const verified = await this.#verifyEthereumAppUnlocked();
        DevLogger.log('[LedgerDMK] Verification result:', verified);
        return verified;
      }

      await this.#handleWrongApp(currentAppName);
      return false;
    } catch (error) {
      DevLogger.log('[LedgerDMK] doEnsureDeviceReady error:', error);

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
    DevLogger.log('[LedgerDMK] Ethereum app detected, verifying unlocked...');

    try {
      if (!this.#sessionId) {
        throw new Error('No active session');
      }

      const dmk = getDmk();
      DevLogger.log(
        '[LedgerDMK] #verifyEthereumAppUnlocked - checking session state for:',
        this.#sessionId,
      );
      const state = await this.#withTimeout(
        firstValueFrom(
          dmk.getDeviceSessionState({ sessionId: this.#sessionId }),
        ),
        LEDGER_OPERATION_TIMEOUT_MS,
        'Device unresponsive during verification',
        () => this.#closeSession('timeout'),
      );

      DevLogger.log(
        '[LedgerDMK] #verifyEthereumAppUnlocked - state:',
        JSON.stringify(state),
      );

      if (state.deviceStatus === 'LOCKED') {
        DevLogger.log(
          '[LedgerDMK] #verifyEthereumAppUnlocked - device is LOCKED',
        );
        DevLogger.log('[LedgerDMK] Device is locked');
        this.#emitEvent({
          event: DeviceEvent.DeviceLocked,
          error: new Error('Device is locked'),
        });
        return false;
      }

      DevLogger.log('[LedgerDMK] Device verified unlocked!');

      this.#emitEvent({
        event: DeviceEvent.AppOpened,
        currentAppName: 'Ethereum',
      });
      return true;
    } catch (verifyError) {
      DevLogger.log('[LedgerDMK] Verification failed:', verifyError);

      if (this.#isTransientBleError(verifyError)) {
        throw verifyError;
      }

      if (this.#isDeviceLocked(verifyError)) {
        DevLogger.log('[LedgerDMK] Device is locked');
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
    DevLogger.log(
      '[LedgerDMK] Wrong app or BOLOS:',
      appName,
      '- user needs to open Ethereum app',
    );

    this.#emitEvent({
      event: DeviceEvent.AppNotOpen,
      currentAppName: 'Ethereum',
    });

    if (appName === 'BOLOS') {
      try {
        DevLogger.log('[LedgerDMK] Requesting Ethereum app to open...');
        await this.#withTimeout(
          openEthereumAppOnLedger(),
          LEDGER_OPERATION_TIMEOUT_MS,
          'Device unresponsive while opening Ethereum app',
          () => this.#closeSession('timeout'),
        );
        DevLogger.log('[LedgerDMK] Open app command sent');
      } catch (openError) {
        DevLogger.log(
          '[LedgerDMK] Failed to send open app command:',
          openError,
        );
        await this.#closeSession('handleWrongApp-error');
      }
    } else {
      try {
        DevLogger.log('[LedgerDMK] Closing wrong app:', appName);
        await this.#withTimeout(
          closeRunningAppOnLedger(),
          LEDGER_OPERATION_TIMEOUT_MS,
          'Device unresponsive while closing current app',
          () => this.#closeSession('timeout'),
        );
        DevLogger.log('[LedgerDMK] Close app command sent');
      } catch (closeError) {
        DevLogger.log('[LedgerDMK] Failed to close app:', closeError);
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

    this.#closeSession('destroy').catch((error) => {
      DevLogger.log('[LedgerDMK] destroy - closeSession error:', error);
    });
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
    DevLogger.log('[LedgerDMK] #handleDisconnect - clearing session');
    this.#sessionId = null;
    this.#sessionStateSubscription?.unsubscribe();
    this.#sessionStateSubscription = null;
    DevLogger.log('[LedgerDMK] handleDisconnect - session cleared');
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
    DevLogger.log(
      '[LedgerDMK] #closeSession - closing session:',
      sessionId,
      'device:',
      deviceId,
      'reason:',
      reason ?? 'unknown',
    );

    try {
      if (sessionId) {
        await getDmk().disconnect({ sessionId });
        DevLogger.log(
          '[LedgerDMK] #closeSession - disconnected session:',
          sessionId,
        );
      }
    } catch (error) {
      DevLogger.log(
        '[LedgerDMK] #closeSession - disconnect error (expected if device gone):',
        error,
      );
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
      DevLogger.log(
        '[LedgerDMK] #cleanupStaleConnections - DMK connected devices:',
        connected.length,
        connected.map((d: ConnectedDevice) => `${d.name}(${d.id})`),
      );
      for (const connectedDevice of connected) {
        DevLogger.log(
          '[LedgerDMK] #cleanupStaleConnections - disconnecting DMK session:',
          connectedDevice.sessionId,
        );
        try {
          await dmk.disconnect({ sessionId: connectedDevice.sessionId });
        } catch (e) {
          DevLogger.log(
            '[LedgerDMK] #cleanupStaleConnections - DMK disconnect error:',
            e,
          );
        }
      }
    } catch (e) {
      DevLogger.log(
        '[LedgerDMK] #cleanupStaleConnections - listConnectedDevices error:',
        e,
      );
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
    DevLogger.log('[LedgerDMK] Starting Bluetooth monitoring');

    this.#bleStateSubscription = TransportBLE.observeState({
      next: (event) => {
        const wasOn = this.#isBluetoothOn;
        const isFirstState = !this.#hasReceivedInitialBleState;

        // Compare as string to avoid BleState type issues
        this.#isBluetoothOn =
          event.available && event.type === BleState.PoweredOn;

        DevLogger.log(
          '[LedgerDMK] BLE state:',
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
        DevLogger.log('[LedgerDMK] BLE state error:', error);
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
        DevLogger.log('[LedgerDMK] Error in transport state callback:', error);
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
