import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapter, HardwareWalletAdapterOptions } from '../types';
import { LedgerBluetoothDMKAdapter } from './LedgerBluetoothDMKAdapter';
import { LedgerBluetoothAdapter } from './LedgerBluetoothAdapter';
import { QRWalletAdapter } from './QRWalletAdapter';
import { NonHardwareAdapter } from './NonHardwareAdapter';
import { store } from '../../../store';
import { selectRemoteFeatureFlags } from '../../../selectors/featureFlagController';
import { isDmkEnabled } from '../../Ledger/dmk';
import type { RootState } from '../../../reducers';

/**
 * Factory function to create the appropriate hardware wallet adapter
 * based on the wallet type.
 *
 * This function always returns an adapter. For null or
 * unknown wallet types, it returns a NonHardwareAdapter (passthrough).
 *
 * @param walletType - The type of hardware wallet (null for non-hardware accounts)
 * @param options - Adapter options including event callbacks
 * @param enableDmk - Optional Ledger DMK override. When omitted, reads the same
 * `isDmkEnabled` decision used at keyring init so adapter and bridge agree.
 * @returns An adapter instance that implements HardwareWalletAdapter
 */
export function createAdapter(
  walletType: HardwareWalletType | null,
  options: HardwareWalletAdapterOptions,
  enableDmk?: boolean,
): HardwareWalletAdapter {
  const useDmk =
    enableDmk ??
    isDmkEnabled(selectRemoteFeatureFlags(store.getState() as RootState));

  switch (walletType) {
    case HardwareWalletType.Ledger:
      return useDmk
        ? new LedgerBluetoothDMKAdapter(options)
        : new LedgerBluetoothAdapter(options);

    case HardwareWalletType.Qr:
      return new QRWalletAdapter(options);

    default:
      return new NonHardwareAdapter(options);
  }
}
