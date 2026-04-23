import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { createLedgerConfig } from './ledger';
import { createQRConfig } from './qr';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';

export function getConfigForWalletType(
  walletType: HardwareWalletType,
): DeviceUIConfig {
  switch (walletType) {
    case HardwareWalletType.Ledger:
      return createLedgerConfig();
    case HardwareWalletType.Qr:
      return createQRConfig();
    default:
      throw new Error(`Unsupported wallet type: ${walletType}`);
  }
}
