import { HD_KEY_TREE, LEDGER_DEVICE } from '../constants/keyringTypes';

export const isHardwareKeyring = (keyringType: string) => {
  if ([HD_KEY_TREE, LEDGER_DEVICE].includes(keyringType)) {
    return true;
  }

  return false;
};

export default isHardwareKeyring;
