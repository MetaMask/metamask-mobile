import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { HardwareWalletAdapter, HardwareWalletAdapterOptions } from '../types';
import { LedgerBluetoothDMKAdapter } from './LedgerBluetoothDMKAdapter';
import { LedgerBluetoothAdapter } from './LedgerBluetoothAdapter';
import { QRWalletAdapter } from './QRWalletAdapter';
import { NonHardwareAdapter } from './NonHardwareAdapter';
import { isDmkEnabled, type HasGetState } from '../../Ledger/dmk';

/**
 * Factory function to create the appropriate hardware wallet adapter
 * based on the wallet type.
 *
 * This function always returns an adapter. For null or
 * unknown wallet types, it returns a NonHardwareAdapter (passthrough).
 *
 * For Ledger wallets, the adapter choice is driven by the `enableDMK`
 * feature flag, resolved via `isDmkEnabled(messenger)`. The messenger
 * is required because the flag lives on the `RemoteFeatureFlagController`
 * (which exposes both remote flags and local dev-tool overrides) — a
 * plain Redux selector is not enough to reproduce that resolution. The
 * caller is expected to obtain the messenger from
 * `Engine.controllerMessenger`.
 *
 * @param walletType - The type of hardware wallet (null for non-hardware accounts)
 * @param options - Adapter options including event callbacks
 * @param messenger - Object exposing `.call('RemoteFeatureFlagController:getState')`,
 * used to resolve the `enableDMK` feature flag. Required to mirror the
 * behavior of `isDmkEnabled` in `core/Ledger/dmk`.
 * @returns An adapter instance that implements HardwareWalletAdapter
 */
export function createAdapter(
  walletType: HardwareWalletType | null,
  options: HardwareWalletAdapterOptions,
  messenger: HasGetState,
): HardwareWalletAdapter {
  switch (walletType) {
    case HardwareWalletType.Ledger: {
      if (isDmkEnabled(messenger)) {
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
