import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapter, HardwareWalletAdapterOptions } from '../types';
import { LedgerBluetoothDMKAdapter } from './LedgerBluetoothDMKAdapter';
import { LedgerBluetoothAdapter } from './LedgerBluetoothAdapter';
import { QRWalletAdapter } from './QRWalletAdapter';
import { NonHardwareAdapter } from './NonHardwareAdapter';

/**
 * Factory function to create the appropriate hardware wallet adapter
 * based on the wallet type.
 *
 * This function always returns an adapter. For null or
 * unknown wallet types, it returns a NonHardwareAdapter (passthrough).
 *
 * For Ledger wallets, the adapter choice is driven by the `enableDmk`
 * flag, which the caller resolves once via `isDmkEnabled` (reading
 * `Engine.controllerMessenger`) before invoking this factory.
 *
 * @param walletType - The type of hardware wallet (null for non-hardware accounts)
 * @param options - Adapter options including event callbacks
 * @param enableDmk - Whether the DMK adapter should be selected for Ledger wallets.
 * Resolved by the caller via `isDmkEnabled(Engine.controllerMessenger)`.
 * @returns An adapter instance that implements HardwareWalletAdapter
 */
export function createAdapter(
  walletType: HardwareWalletType | null,
  options: HardwareWalletAdapterOptions,
  enableDmk: boolean,
): HardwareWalletAdapter {
  switch (walletType) {
    case HardwareWalletType.Ledger: {
      if (enableDmk) {
        return new LedgerBluetoothDMKAdapter(options);
      }
      return new LedgerBluetoothAdapter(options);
    }

    case HardwareWalletType.Qr:
      return new QRWalletAdapter(options);

    default:
      return new NonHardwareAdapter(options);
  }
}
