/* eslint-disable react-native/split-platform-components */
/**
 * QR Hardware Wallet Adapter
 *
 * Implements the HardwareWalletAdapter interface for QR-based hardware wallets
 * (e.g., Keystone, AirGap). Handles camera permissions and QR code scanning
 * for transaction signing.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import {
  HardwareWalletAdapter,
  HardwareWalletAccount,
  HardwareWalletType,
  QRHardwareAdapterOptions,
  QRSigningState,
  QRSigningStatus,
  CameraPermissionStatus,
  QRScanRequestType,
  QRHardwareErrorCode,
  QRHardwareError,
} from '../types';
import { createQRHardwareError } from '../errors';
import { withQrKeyring, forgetQrDevice } from '../../QrKeyring/QrKeyring';
import Engine from '../../Engine';
import Logger from '../../../util/Logger';

const LOG_TAG = 'QRAdapter';

/**
 * QR adapter implementing the HardwareWalletAdapter interface
 */
export class QRAdapter implements HardwareWalletAdapter {
  readonly type = HardwareWalletType.QR;

  private options: QRHardwareAdapterOptions;
  private cameraPermission: CameraPermissionStatus =
    CameraPermissionStatus.UNKNOWN;
  private signingState: QRSigningState = QRSigningState.idle();
  private isConnectedState: boolean = false;
  private scannerUnsubscribe: (() => void) | null = null;

  constructor(options?: QRHardwareAdapterOptions) {
    this.options = options || {};
  }

  /**
   * Check camera permission status
   */
  async checkCameraPermission(): Promise<CameraPermissionStatus> {
    if (Platform.OS === 'ios') {
      // iOS handles camera permission automatically when accessing camera
      this.cameraPermission = CameraPermissionStatus.GRANTED;
      return this.cameraPermission;
    }

    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      this.cameraPermission = hasPermission
        ? CameraPermissionStatus.GRANTED
        : CameraPermissionStatus.DENIED;

      if (!hasPermission) {
        this.options.onCameraPermissionNeeded?.();
      }

      return this.cameraPermission;
    } catch (error) {
      Logger.log(LOG_TAG, 'Error checking camera permission', error);
      this.cameraPermission = CameraPermissionStatus.UNKNOWN;
      return this.cameraPermission;
    }
  }

  /**
   * Request camera permission (Android only)
   */
  async requestCameraPermission(): Promise<CameraPermissionStatus> {
    if (Platform.OS === 'ios') {
      this.cameraPermission = CameraPermissionStatus.GRANTED;
      this.options.onCameraPermissionGranted?.();
      return this.cameraPermission;
    }

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        this.cameraPermission = CameraPermissionStatus.GRANTED;
        this.options.onCameraPermissionGranted?.();
      } else {
        this.cameraPermission = CameraPermissionStatus.DENIED;
        this.options.onCameraPermissionDenied?.();
      }

      return this.cameraPermission;
    } catch (error) {
      Logger.log(LOG_TAG, 'Error requesting camera permission', error);
      this.cameraPermission = CameraPermissionStatus.DENIED;
      this.options.onCameraPermissionDenied?.();
      return this.cameraPermission;
    }
  }

  /**
   * Get current camera permission status
   */
  getCameraPermission(): CameraPermissionStatus {
    return this.cameraPermission;
  }

  /**
   * Get current signing state
   */
  getSigningState(): QRSigningState {
    return this.signingState;
  }

  /**
   * Connect to the QR hardware wallet
   * For QR wallets, "connecting" means verifying camera access
   */
  async connect(_deviceId: string): Promise<void> {
    Logger.log(LOG_TAG, 'Connecting to QR wallet');

    const permission = await this.checkCameraPermission();

    if (permission === CameraPermissionStatus.DENIED) {
      const requestedPermission = await this.requestCameraPermission();
      if (requestedPermission === CameraPermissionStatus.DENIED) {
        this.signingState = QRSigningState.needsCameraPermission();
        throw createQRHardwareError(
          QRHardwareErrorCode.CAMERA_PERMISSION_DENIED,
        );
      }
    }

    this.isConnectedState = true;
    this.signingState = QRSigningState.idle();
    Logger.log(LOG_TAG, 'QR wallet connected (camera ready)');
  }

  /**
   * Disconnect from the QR hardware wallet
   */
  async disconnect(): Promise<void> {
    Logger.log(LOG_TAG, 'Disconnecting QR wallet');
    this.isConnectedState = false;
    this.signingState = QRSigningState.idle();
    this.cleanupScannerSubscription();
  }

  /**
   * Check if connected (camera permission granted)
   */
  isConnected(): boolean {
    return (
      this.isConnectedState &&
      this.cameraPermission === CameraPermissionStatus.GRANTED
    );
  }

  /**
   * Get device ID (QR wallets don't have a persistent device ID)
   */
  getDeviceId(): string | null {
    return this.isConnectedState ? 'qr-wallet' : null;
  }

  /**
   * Set HD derivation path
   * Note: QR keyring manages HD paths internally based on the synced device
   */
  async setHDPath(path: string): Promise<void> {
    Logger.log(LOG_TAG, `Setting HD path: ${path} (no-op for QR keyring)`);
    // QR keyring doesn't support setHDPath - the path is determined by the hardware device
  }

  /**
   * Get accounts from the QR hardware wallet
   */
  async getAccounts(page: number): Promise<HardwareWalletAccount[]> {
    Logger.log(LOG_TAG, `Getting accounts page: ${page}`);

    const accounts = await withQrKeyring(async ({ keyring }) => {
      if (page === 0) {
        return keyring.getFirstPage();
      } else if (page > 0) {
        return keyring.getNextPage();
      }
      return keyring.getPreviousPage();
    });

    // QR keyring accounts don't include balance - use default
    return accounts.map((account, index) => ({
      address: account.address,
      index: page * 5 + index, // Assuming 5 accounts per page
      balance: '0x0',
    }));
  }

  /**
   * Unlock an account at the specified index
   */
  async unlockAccount(index: number): Promise<string> {
    Logger.log(LOG_TAG, `Unlocking account at index: ${index}`);

    const address = await withQrKeyring(async ({ keyring }) => {
      const accounts = await keyring.getAccounts();
      if (index >= 0 && index < accounts.length) {
        return accounts[index];
      }
      throw new Error(`Account at index ${index} not found`);
    });

    return address;
  }

  /**
   * Forget the QR device
   */
  async forgetDevice(): Promise<void> {
    Logger.log(LOG_TAG, 'Forgetting QR device');
    await forgetQrDevice();
    this.isConnectedState = false;
    this.signingState = QRSigningState.idle();
  }

  /**
   * Clean up scanner subscription
   */
  private cleanupScannerSubscription(): void {
    if (this.scannerUnsubscribe) {
      this.scannerUnsubscribe();
      this.scannerUnsubscribe = null;
    }
  }

  /**
   * Start awaiting a scan request
   */
  startAwaitingScan(
    requestType: QRScanRequestType,
    requestData?: unknown,
  ): void {
    Logger.log(LOG_TAG, `Starting await scan: ${requestType}`);
    this.signingState = QRSigningState.awaitingScan(requestType, requestData);
    this.options.onScanRequested?.(requestType, requestData);
  }

  /**
   * Set scanning state (camera active)
   */
  setScanning(requestType: QRScanRequestType): void {
    Logger.log(LOG_TAG, 'Setting scanning state');
    this.signingState = QRSigningState.scanning(requestType);
  }

  /**
   * Set processing state
   */
  setProcessing(): void {
    Logger.log(LOG_TAG, 'Setting processing state');
    this.signingState = QRSigningState.processing();
  }

  /**
   * Complete the scan request
   */
  completeScan(): void {
    Logger.log(LOG_TAG, 'Completing scan');
    this.signingState = QRSigningState.completed();
    this.options.onScanCompleted?.();
  }

  /**
   * Cancel or reject the scan request
   */
  async cancelScan(error?: Error): Promise<void> {
    Logger.log(LOG_TAG, 'Cancelling scan', error?.message);

    try {
      const scanner = Engine.getQrKeyringScanner();
      scanner.rejectPendingScan(error || new Error('Scan cancelled'));
    } catch (e) {
      Logger.log(LOG_TAG, 'Error rejecting pending scan', e);
    }

    this.signingState = QRSigningState.idle();
    this.options.onScanRejected?.(error || new Error('Scan cancelled'));
  }

  /**
   * Set error state
   */
  setError(error: QRHardwareError): void {
    Logger.log(LOG_TAG, 'Setting error state', error);
    this.signingState = QRSigningState.error(error);
  }

  /**
   * Reset to idle state
   */
  resetToIdle(): void {
    this.signingState = QRSigningState.idle();
  }

  /**
   * Check if currently in a signing operation
   */
  isInSigningFlow(): boolean {
    return (
      this.signingState.status !== QRSigningStatus.IDLE &&
      this.signingState.status !== QRSigningStatus.ERROR &&
      this.signingState.status !== QRSigningStatus.COMPLETED
    );
  }

  /**
   * Resolve a pending scan with QR data
   */
  async resolveScan(urType: string, cborHex: string): Promise<void> {
    Logger.log(LOG_TAG, 'Resolving scan');

    try {
      this.setProcessing();

      const scanner = Engine.getQrKeyringScanner();
      scanner.resolvePendingScan({
        type: urType,
        cbor: cborHex,
      });

      this.completeScan();
    } catch (error) {
      Logger.log(LOG_TAG, 'Error resolving scan', error);
      const qrError = createQRHardwareError(
        QRHardwareErrorCode.INVALID_QR_CODE,
      );
      this.setError(qrError);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    Logger.log(LOG_TAG, 'Destroying QR adapter');
    this.cleanupScannerSubscription();
    this.isConnectedState = false;
    this.signingState = QRSigningState.idle();
  }
}
