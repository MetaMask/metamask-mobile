import { strings } from '../../../locales/i18n';
import { isHardwareAccount } from '../../util/address';
import ExtendedKeyringTypes from '../../constants/keyringTypes';

/**
 * Supported hardware wallet types
 */
export enum HardwareWalletType {
  Ledger = 'ledger',
  QR = 'qr',
}

/**
 * Helper to get wallet type display name
 */
export const getHardwareWalletTypeName = (
  walletType?: HardwareWalletType,
): string => {
  switch (walletType) {
    case HardwareWalletType.Ledger:
      return strings('hardware_wallet.device_names.ledger');
    case HardwareWalletType.QR:
      return strings('hardware_wallet.device_names.qr');
    default:
      return strings('hardware_wallet.device_names.hardware_wallet');
  }
};

/**
 * Detect the hardware wallet type for a given address.
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
    return HardwareWalletType.QR;
  }
  return undefined;
}
