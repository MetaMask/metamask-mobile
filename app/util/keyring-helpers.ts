import {
  QR_HARDWARE_WALLET_DEVICE,
  LEDGER_DEVICE,
} from '../constants/keyringTypes';

export const isHardwareKeyring = (keyringType: string) => {
  if ([QR_HARDWARE_WALLET_DEVICE, LEDGER_DEVICE].includes(keyringType)) {
    return true;
  }

  return false;
};

export default isHardwareKeyring;
