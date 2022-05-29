import isHardwareKeyring from './keyring-helpers';
import {
  HD_KEY_TREE,
  QR_HARDWARE_WALLET_DEVICE,
  LEDGER_DEVICE,
} from '../constants/keyringTypes';

describe('isHardwareKeyring', () => {
  it('should return true if Keyring type is ledger keyring', () => {
    expect(isHardwareKeyring(LEDGER_DEVICE)).toBe(true);
  });

  it('should return true if Keyring type is QR keyring', () => {
    expect(isHardwareKeyring(QR_HARDWARE_WALLET_DEVICE)).toBe(true);
  });

  it('should return false if Keyring type is HD keyring', () => {
    expect(isHardwareKeyring(HD_KEY_TREE)).toBe(false);
  });
});
