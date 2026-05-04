import {
  HardwareWalletError,
  type HardwareWalletErrorOptions,
} from '@metamask/hw-wallet-sdk';

import type {
  QRHardwareScanErrorMetadata,
  QRHardwareScanErrorOptions,
} from './qrScan.types';

/**
 * Hardware wallet error for animated QR scan flows (pairing and signing).
 * Prefer over `HardwareWalletError` when constructing errors with QR scan metadata.
 */
export class QRHardwareScanError extends HardwareWalletError {
  readonly metadata: QRHardwareScanErrorMetadata;

  constructor(message: string, options: QRHardwareScanErrorOptions) {
    super(message, options as HardwareWalletErrorOptions);
    this.metadata = options.metadata;
  }
}
