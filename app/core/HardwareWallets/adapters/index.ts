/**
 * Hardware Wallet Adapter Factory
 *
 * Creates the appropriate adapter for each hardware wallet type.
 */

import {
  HardwareWalletAdapter,
  HardwareWalletAdapterOptions,
  HardwareWalletType,
} from '../types';
import { LedgerAdapter } from './LedgerAdapter';

/**
 * Factory function to create the appropriate adapter for a hardware wallet type
 */
export const createAdapter = (
  type: HardwareWalletType,
  options?: HardwareWalletAdapterOptions,
): HardwareWalletAdapter => {
  switch (type) {
    case HardwareWalletType.LEDGER:
      return new LedgerAdapter(options);
    case HardwareWalletType.TREZOR:
      throw new Error('Trezor adapter not yet implemented');
    case HardwareWalletType.QR:
      throw new Error('QR adapter not yet implemented');
    default:
      throw new Error(`Unknown hardware wallet type: ${type}`);
  }
};

export { LedgerAdapter } from './LedgerAdapter';
