import {
  HardwareWalletType,
  DeviceEvent,
  DeviceEventPayload,
  ErrorCode,
} from '@metamask/hw-wallet-sdk';
import {
  DiscoveredDevice,
  HardwareWalletAdapter,
  HardwareWalletAdapterOptions,
} from '../types';
import DevLogger from '../../SDKConnect/utils/DevLogger';

/**
 * Adapter for QR hardware wallets.
 *
 * QR wallets work differently from Bluetooth-based wallets like Ledger:
 * - There is NO persistent connection - you scan QR codes when signing transactions
 * - Device "connection" is just verifying we have a valid QR account
 * - The only transport requirement is camera permission for scanning
 * - Actual QR scanning is handled by the existing QrKeyringScanner system
 *
 * This adapter provides a unified interface so the HardwareWalletContext
 * can treat QR wallets the same way as other hardware wallets.
 */

export class QRWalletAdapter implements HardwareWalletAdapter {
  readonly walletType = HardwareWalletType.Qr;
  readonly requiresDeviceDiscovery = false;

  #options: HardwareWalletAdapterOptions;
  #deviceId: string | null = null;
  #isConnected = false;
  #flowComplete = false;
  #isDestroyed = false;

  constructor(options: HardwareWalletAdapterOptions) {
    this.#options = options;
    DevLogger.log('[QRWalletAdapter] Created');
  }

  // ============ Connection Methods ============

  /**
   * For QR wallets, "connecting" just means acknowledging the device.
   * There's no actual persistent connection.
   */
  async connect(deviceId: string): Promise<void> {
    if (this.#isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }

    DevLogger.log('[QRWalletAdapter] connect called for device:', deviceId);

    // For QR wallets, we just store the device ID
    // The deviceId can be the account address or 'default' for wallets without real device IDs
    this.#deviceId = deviceId;
    this.#isConnected = true;

    this.#emitEvent({
      event: DeviceEvent.Connected,
      deviceId,
    });
  }

  /**
   * For QR wallets, disconnect is a no-op since there's no persistent connection.
   */
  async disconnect(): Promise<void> {
    DevLogger.log('[QRWalletAdapter] disconnect called');

    const previousDeviceId = this.#deviceId;
    this.#clearConnectionState();

    if (previousDeviceId && !this.#flowComplete) {
      this.#emitEvent({
        event: DeviceEvent.Disconnected,
        deviceId: previousDeviceId,
      });
    }
  }

  getConnectedDeviceId(): string | null {
    return this.#deviceId;
  }

  isConnected(): boolean {
    return this.#isConnected;
  }

  // ============ Device Readiness ============

  /**
   * For QR wallets, device readiness means we have a valid QR account reference.
   * Camera permission is handled later by the scanner modal when it opens.
   *
   * Unlike Ledger, we don't need to check if an app is open
   * because QR wallets are ready to sign whenever needed.
   */
  async ensureDeviceReady(deviceId: string): Promise<boolean> {
    if (this.#isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }

    DevLogger.log('[QRWalletAdapter] ensureDeviceReady called for:', deviceId);

    // Store the device ID
    this.#deviceId = deviceId;
    this.#isConnected = true;

    DevLogger.log('[QRWalletAdapter] Device is ready');

    // For QR wallets, we consider the "app" to always be open
    // since there's no app concept like on Ledger
    this.#emitEvent({
      event: DeviceEvent.AppOpened,
    });

    return true;
  }

  // ============ Flow State Management ============

  markFlowComplete(): void {
    DevLogger.log('[QRWalletAdapter] Marking flow as complete');
    this.#flowComplete = true;
  }

  isFlowComplete(): boolean {
    return this.#flowComplete;
  }

  resetFlowState(): void {
    DevLogger.log('[QRWalletAdapter] Resetting flow state');
    this.#flowComplete = false;
  }

  reset(): void {
    DevLogger.log('[QRWalletAdapter] Resetting adapter state');
    this.#flowComplete = false;
    this.#clearConnectionState();
  }

  // ============ Device Discovery ============

  /**
   * QR wallets don't need device discovery like BLE.
   * The QR account is already added to the wallet.
   * This method is a no-op for QR adapters.
   */
  startDeviceDiscovery(
    _onDeviceFound: (device: DiscoveredDevice) => void,
    _onError: (error: Error) => void,
  ): () => void {
    if (this.#isDestroyed) {
      throw new Error('Adapter has been destroyed');
    }

    // No-op for QR wallets - device is already known (no BLE scanning needed)
    // Return a no-op cleanup function
    return () => {
      // no-op
    };
  }

  stopDeviceDiscovery(): void {
    // No-op for QR wallets
  }

  // ============ Transport State ============

  async ensurePermissions(): Promise<boolean> {
    return true;
  }

  /**
   * Camera permission is requested by the scanner modal itself.
   * Returning true here avoids blocking the QR flow before the scanner opens.
   */
  async isTransportAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * QR wallets don't need transport state monitoring since
   * camera is only needed during scanning, not for a persistent connection.
   */
  onTransportStateChange(
    _callback: (isAvailable: boolean) => void,
  ): () => void {
    // No-op for QR wallets - camera permission is checked on-demand
    // Return a no-op cleanup function
    return () => {
      // no-op
    };
  }

  getRequiredAppName(): string | undefined {
    // QR wallets don't have an app concept like Ledger
    return undefined;
  }

  /**
   * Returns null because QR wallets don't need persistent transport monitoring.
   * Camera permission is only needed during the actual QR scan,
   * which happens when signing transactions, not during connection.
   */
  getTransportDisabledErrorCode(): ErrorCode | null {
    return null;
  }

  // ============ Cleanup ============

  destroy(): void {
    DevLogger.log('[QRWalletAdapter] Destroying adapter');
    this.#isDestroyed = true;
    this.#clearConnectionState();
  }

  // ============ Private Methods ============

  #clearConnectionState(): void {
    this.#isConnected = false;
    this.#deviceId = null;
  }

  #emitEvent(payload: DeviceEventPayload): void {
    this.#options.onDeviceEvent(payload);
  }
}
