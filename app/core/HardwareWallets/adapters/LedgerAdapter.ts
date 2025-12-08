/**
 * Ledger Hardware Wallet Adapter
 *
 * Implements the HardwareWalletAdapter interface for Ledger devices.
 * Handles BLE transport events for connection state, errors, and device status.
 */

import BleTransport from '@ledgerhq/react-native-hw-transport-ble';
import { type BleError } from 'react-native-ble-plx';
import {
  HardwareWalletAdapter,
  HardwareWalletAdapterOptions,
  HardwareWalletAccount,
  HardwareWalletType,
  HardwareWalletErrorCode,
  DeviceEvent,
} from '../types';
import {
  createHardwareWalletError,
  parseLedgerError,
  parseBleError,
} from '../errors';
import {
  connectLedgerHardware,
  openEthereumAppOnLedger,
  closeRunningAppOnLedger,
  forgetLedger,
  setHDPath,
  getLedgerAccountsByOperation,
  unlockLedgerWalletAccount,
  getCurrentAppName as getLedgerCurrentAppName,
} from '../../Ledger/Ledger';
import PAGINATION_OPERATIONS from '../../../constants/pagination';
import { LEDGER_LIVE_PATH } from '../../Ledger/constants';
import Logger from '../../../util/Logger';

const LOG_TAG = 'LedgerAdapter';

/**
 * Error thrown when app switching is required
 */
export class AppSwitchRequiredError extends Error {
  public readonly currentApp: string;

  constructor(currentApp: string) {
    super(`App switch required. Current app: ${currentApp}`);
    this.name = 'AppSwitchRequiredError';
    this.currentApp = currentApp;
  }
}

/**
 * Ledger adapter implementing the HardwareWalletAdapter interface
 */
export class LedgerAdapter implements HardwareWalletAdapter {
  readonly type = HardwareWalletType.LEDGER;

  private transport: BleTransport | null = null;
  private deviceId: string | null = null;
  private options: HardwareWalletAdapterOptions;
  private hdPath: string = LEDGER_LIVE_PATH;
  private lastKnownAppName: string | null = null;

  constructor(options?: HardwareWalletAdapterOptions) {
    this.options = options || {};
  }

  /**
   * Handle disconnect event from BLE transport
   */
  private handleTransportDisconnect = (error: BleError | null): void => {
    Logger.log(LOG_TAG, 'Transport disconnected', error);

    const wasConnected = this.transport !== null;
    this.transport = null;

    // Parse the BLE error to determine the specific cause
    if (error) {
      const hwError = parseBleError(error);

      // Emit specific events based on error type
      if (hwError.code === HardwareWalletErrorCode.DEVICE_LOCKED) {
        this.options.onDeviceLocked?.();
        this.options.onDeviceEvent?.({
          event: DeviceEvent.DEVICE_LOCKED,
          error: hwError,
          originalError: error,
        });
      } else if (hwError.code === HardwareWalletErrorCode.APP_NOT_OPEN) {
        this.options.onAppNotOpen?.();
        this.options.onDeviceEvent?.({
          event: DeviceEvent.APP_NOT_OPEN,
          error: hwError,
          originalError: error,
        });
      } else {
        this.options.onDeviceEvent?.({
          event: DeviceEvent.DISCONNECTED,
          error: hwError,
          originalError: error,
        });
      }
    }

    // Always notify disconnect
    if (wasConnected) {
      this.options.onDisconnect?.(error);
    }
  };

  /**
   * Handle errors from BLE transport
   */
  private handleTransportError = (error: unknown): void => {
    Logger.log(LOG_TAG, 'Transport error', error);

    const hwError = parseLedgerError(error);

    // Emit specific events based on error type
    switch (hwError.code) {
      case HardwareWalletErrorCode.DEVICE_LOCKED:
        this.options.onDeviceLocked?.();
        this.options.onDeviceEvent?.({
          event: DeviceEvent.DEVICE_LOCKED,
          error: hwError,
          originalError: error,
        });
        break;
      case HardwareWalletErrorCode.APP_NOT_OPEN:
        this.options.onAppNotOpen?.();
        this.options.onDeviceEvent?.({
          event: DeviceEvent.APP_NOT_OPEN,
          error: hwError,
          originalError: error,
        });
        break;
      default:
        this.options.onDeviceEvent?.({
          event: DeviceEvent.DISCONNECTED,
          error: hwError,
          originalError: error,
        });
    }
  };

  /**
   * Connect to the Ledger device via Bluetooth
   */
  async connect(deviceId: string): Promise<void> {
    try {
      // Dynamic import to avoid loading Bluetooth module until needed
      Logger.log(LOG_TAG, `Opening transport for device ${deviceId}`);
      this.transport = await BleTransport.open(deviceId);
      this.deviceId = deviceId;

      // Set up disconnect handler with error details
      this.transport.on('disconnect', this.handleTransportDisconnect);

      // Set up error handler
      this.transport.on('error', this.handleTransportError);

      // Set up device-level disconnect monitoring
      this.transport.device.onDisconnected((error) => {
        console.log('[LedgerAdapter] Device disconnected via BLE:', error);
      });

      // Verify connection and check which app is running
      const appName = await connectLedgerHardware(this.transport, deviceId);
      Logger.log(LOG_TAG, `Connected, current app: ${appName}`);
      this.lastKnownAppName = appName;

      // Handle app switching
      await this.ensureEthereumApp(appName);
    } catch (error) {
      Logger.log(LOG_TAG, 'Connection error', error);

      // Check for specific error types
      const hwError = parseLedgerError(error);

      // Handle iOS pairing removed error
      if (this.isPairingRemovedError(error)) {
        const deviceName = this.getDeviceNameFromError(error);
        this.options.onPairingRemoved?.(deviceName);
        this.options.onDeviceEvent?.({
          event: DeviceEvent.PAIRING_REMOVED,
          error: hwError,
          originalError: error,
        });
      } else if (hwError.code === HardwareWalletErrorCode.DEVICE_LOCKED) {
        this.options.onDeviceLocked?.();
        this.options.onDeviceEvent?.({
          event: DeviceEvent.DEVICE_LOCKED,
          error: hwError,
          originalError: error,
        });
      } else if (hwError.code === HardwareWalletErrorCode.APP_NOT_OPEN) {
        this.options.onAppNotOpen?.();
        this.options.onDeviceEvent?.({
          event: DeviceEvent.APP_NOT_OPEN,
          error: hwError,
          originalError: error,
        });
      } else {
        this.options.onDeviceEvent?.({
          event: DeviceEvent.CONNECTION_FAILED,
          error: hwError,
          originalError: error,
        });
      }

      this.transport = null;
      this.deviceId = null;
      throw error;
    }
  }

  /**
   * Check if the error is an iOS pairing removed error
   */
  private isPairingRemovedError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      const err = error as { iosErrorCode?: number; reason?: string };
      return (
        err.iosErrorCode === 14 ||
        err.reason === 'Peer removed pairing information'
      );
    }
    return false;
  }

  /**
   * Extract device name from error if available
   */
  private getDeviceNameFromError(error: unknown): string | undefined {
    if (error && typeof error === 'object') {
      const err = error as { deviceName?: string };
      return err.deviceName;
    }
    return undefined;
  }

  /**
   * Ensure the Ethereum app is open on the Ledger device
   */
  private async ensureEthereumApp(currentApp: string): Promise<void> {
    if (currentApp === 'Ethereum') {
      return;
    }

    if (currentApp === 'BOLOS') {
      // On main screen, need to open Ethereum app
      try {
        await openEthereumAppOnLedger();
        // Device will disconnect after app opens, throw to signal reconnect needed
        throw new AppSwitchRequiredError(currentApp);
      } catch (error) {
        if (error instanceof AppSwitchRequiredError) {
          throw error;
        }
        // Parse the specific error from opening the app
        throw parseLedgerError(error);
      }
    }

    // Wrong app is open, close it first
    try {
      await closeRunningAppOnLedger();
      throw new AppSwitchRequiredError(currentApp);
    } catch (error) {
      if (error instanceof AppSwitchRequiredError) {
        throw error;
      }
      throw createHardwareWalletError(
        HardwareWalletErrorCode.FAILED_TO_CLOSE_APP,
        HardwareWalletType.LEDGER,
      );
    }
  }

  /**
   * Disconnect from the Ledger device
   */
  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
    this.deviceId = null;
  }

  /**
   * Check if the device is currently connected
   */
  isConnected(): boolean {
    return this.transport !== null;
  }

  /**
   * Get the current device ID
   */
  getDeviceId(): string | null {
    return this.deviceId;
  }

  /**
   * Set the HD derivation path
   */
  async setHDPath(path: string): Promise<void> {
    this.hdPath = path;
    await setHDPath(path);
  }

  /**
   * Get accounts from the Ledger device
   */
  async getAccounts(page: number): Promise<HardwareWalletAccount[]> {
    let operation: number;

    if (page === 0) {
      operation = PAGINATION_OPERATIONS.GET_FIRST_PAGE;
    } else if (page > 0) {
      operation = PAGINATION_OPERATIONS.GET_NEXT_PAGE;
    } else {
      operation = PAGINATION_OPERATIONS.GET_PREVIOUS_PAGE;
    }

    const accounts = await getLedgerAccountsByOperation(operation);

    return accounts.map((account) => ({
      address: account.address,
      index: account.index,
      balance: account.balance,
    }));
  }

  /**
   * Unlock an account at the specified index
   */
  async unlockAccount(index: number): Promise<string> {
    await unlockLedgerWalletAccount(index);
    // The function sets the selected address internally
    // We need to return the unlocked address
    const accounts = await getLedgerAccountsByOperation(
      PAGINATION_OPERATIONS.GET_FIRST_PAGE,
    );
    const account = accounts.find((a) => a.index === index);
    return account?.address || '';
  }

  /**
   * Forget the Ledger device
   */
  async forgetDevice(): Promise<void> {
    await this.disconnect();
    await forgetLedger();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    Logger.log(LOG_TAG, 'Destroying adapter');

    if (this.transport) {
      // Remove event listeners before closing
      this.transport.off?.('disconnect', this.handleTransportDisconnect);
      this.transport.off?.('error', this.handleTransportError);

      this.transport.close().catch(() => {
        // Ignore errors during cleanup
      });
      this.transport = null;
    }
    this.deviceId = null;
  }

  /**
   * Get the current transport for operations that need direct access
   * @internal
   */
  getTransport(): BleTransport | null {
    return this.transport;
  }

  /**
   * Get the name of the currently open app on the device
   * This queries the device to get the current app name and detects app changes.
   * @returns The app name (e.g., "Ethereum", "BOLOS" for main menu)
   */
  async getCurrentAppName(): Promise<string> {
    const previousAppName = this.lastKnownAppName;

    try {
      const currentAppName = await getLedgerCurrentAppName();
      this.lastKnownAppName = currentAppName;

      // Detect app change
      if (previousAppName && previousAppName !== currentAppName) {
        Logger.log(
          LOG_TAG,
          `App changed from ${previousAppName} to ${currentAppName}`,
        );

        // Emit app changed event
        this.options.onDeviceEvent?.({
          event: DeviceEvent.APP_CHANGED,
          previousAppName,
          currentAppName,
        });

        // If changed away from Ethereum, notify
        if (currentAppName !== 'Ethereum') {
          this.options.onAppNotOpen?.();
        }
      }

      return currentAppName;
    } catch (error) {
      Logger.log(LOG_TAG, 'Failed to get current app name', error);
      throw error;
    }
  }

  /**
   * Get the last known app name without querying the device
   */
  getLastKnownAppName(): string | null {
    return this.lastKnownAppName;
  }
}
