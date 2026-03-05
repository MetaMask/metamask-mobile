import { isHardwareAccount } from '../../util/address';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { strings } from '../../../locales/i18n';

/**
 * Helper to get wallet type display name
 */
export const getHardwareWalletTypeName = (
  walletType?: HardwareWalletType | null,
): string => {
  switch (walletType) {
    case HardwareWalletType.Ledger:
      return strings('hardware_wallet.device_names.ledger');
    case HardwareWalletType.Qr:
      return strings('hardware_wallet.device_names.qr');
    default:
      return strings('hardware_wallet.device_names.hardware_wallet');
  }
};

/**
 * Get the hardware wallet type for a given address.
 *
 * @param address - The wallet address to check
 * @returns The HardwareWalletType if it's a hardware wallet, undefined otherwise
 */
export function getHardwareWalletTypeForAddress(
  address: string,
): HardwareWalletType | undefined {
  if (isHardwareAccount(address, [ExtendedKeyringTypes.ledger])) {
    return HardwareWalletType.Ledger;
  }
  if (isHardwareAccount(address, [ExtendedKeyringTypes.qr])) {
    return HardwareWalletType.Qr;
  }
  return undefined;
}

/**
 * Returns i18n keys for connection tips based on the wallet type.
 */
export function getConnectionTipsForWalletType(
  walletType: HardwareWalletType | null,
): string[] {
  switch (walletType) {
    case HardwareWalletType.Ledger:
      return [
        'hardware_wallet.connecting.tip_unlock',
        'hardware_wallet.connecting.tip_open_app',
        'hardware_wallet.connecting.tip_enable_bluetooth',
        'hardware_wallet.connecting.tip_dnd_off',
      ];
    default:
      return [];
  }
}
