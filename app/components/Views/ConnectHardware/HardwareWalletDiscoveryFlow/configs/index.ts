import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { createLedgerConfig } from './ledger';
import { createQRConfig } from './qr';
import type { DeviceUIConfig } from '../DiscoveryFlow.types';

/**
 * Returns the device-specific UI configuration for the given hardware wallet
 * type. Throws if the wallet type is not supported by the discovery flow.
 *
 * @param walletType - The hardware wallet type to look up.
 * @returns The UI configuration used to drive the discovery flow screens.
 */
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
