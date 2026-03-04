import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapter, HardwareWalletAdapterOptions } from '../types';
import { LedgerBluetoothAdapter } from './LedgerBluetoothAdapter';
import { NonHardwareAdapter } from './NonHardwareAdapter';

/**
 * Factory function to create the appropriate hardware wallet adapter
 * based on the wallet type.
 *
 * This function always returns an adapter. For null or
 * unknown wallet types, it returns a NonHardwareAdapter (passthrough).
 *
 *
 * @param walletType - The type of hardware wallet (null for non-hardware accounts)
 * @param options - Adapter options including event callbacks
 * @returns An adapter instance that implements HardwareWalletAdapter
 */
export function createAdapter(
  walletType: HardwareWalletType | null,
  options: HardwareWalletAdapterOptions,
): HardwareWalletAdapter {
  switch (walletType) {
    case HardwareWalletType.Ledger:
      return new LedgerBluetoothAdapter(options);

    default:
      return new NonHardwareAdapter(options);
  }
}

/**
 * Check if a wallet type requires Bluetooth
 */
export function requiresBluetooth(
  walletType: HardwareWalletType | null,
): boolean {
  return walletType === HardwareWalletType.Ledger;
}
