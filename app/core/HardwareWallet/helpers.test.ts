import {
  HardwareWalletType,
  getHardwareWalletTypeName,
  getHardwareWalletTypeForAddress,
} from './helpers';

jest.mock('../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'hardware_wallet.device_names.ledger': 'Ledger',
      'hardware_wallet.device_names.qr': 'QR Hardware Wallet',
      'hardware_wallet.device_names.hardware_wallet': 'Hardware Wallet',
    };
    return translations[key] ?? key;
  }),
}));

const mockIsHardwareAccount = jest.fn();

jest.mock('../../util/address', () => ({
  isHardwareAccount: (...args: unknown[]) => mockIsHardwareAccount(...args),
}));

jest.mock('../../constants/keyringTypes', () => ({
  default: {
    ledger: 'Ledger Hardware',
    qr: 'QR Hardware Wallet Device',
  },
}));

describe('HardwareWallet helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('HardwareWalletType', () => {
    it('has Ledger type', () => {
      expect(HardwareWalletType.Ledger).toBe('ledger');
    });

    it('has QR type', () => {
      expect(HardwareWalletType.QR).toBe('qr');
    });
  });

  describe('getHardwareWalletTypeName', () => {
    it('returns "Ledger" for Ledger type', () => {
      const name = getHardwareWalletTypeName(HardwareWalletType.Ledger);
      expect(name).toBe('Ledger');
    });

    it('returns "QR Hardware Wallet" for QR type', () => {
      const name = getHardwareWalletTypeName(HardwareWalletType.QR);
      expect(name).toBe('QR Hardware Wallet');
    });

    it('returns "Hardware Wallet" for undefined type', () => {
      const name = getHardwareWalletTypeName(undefined);
      expect(name).toBe('Hardware Wallet');
    });

    it('returns "Hardware Wallet" for unknown type', () => {
      const name = getHardwareWalletTypeName('unknown' as HardwareWalletType);
      expect(name).toBe('Hardware Wallet');
    });
  });

  describe('getHardwareWalletTypeForAddress', () => {
    const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

    it('returns Ledger for Ledger hardware account', () => {
      // First call with ledger keyring types returns true
      // Second call with qr keyring types returns false
      mockIsHardwareAccount
        .mockReturnValueOnce(true) // isHardwareAccount(address, [ledger])
        .mockReturnValueOnce(false); // isHardwareAccount(address, [qr])

      const result = getHardwareWalletTypeForAddress(testAddress);
      expect(result).toBe(HardwareWalletType.Ledger);
    });

    it('returns QR for QR hardware account', () => {
      // Reset mock and set up fresh implementation
      mockIsHardwareAccount.mockReset();
      // First call with ledger keyring types returns false
      // Second call with qr keyring types returns true
      mockIsHardwareAccount
        .mockReturnValueOnce(false) // isHardwareAccount(address, [ledger])
        .mockReturnValueOnce(true); // isHardwareAccount(address, [qr])

      const result = getHardwareWalletTypeForAddress(testAddress);
      expect(result).toBe(HardwareWalletType.QR);
    });

    it('returns undefined for non-hardware account', () => {
      mockIsHardwareAccount.mockReset();
      mockIsHardwareAccount
        .mockReturnValueOnce(false) // isHardwareAccount(address, [ledger])
        .mockReturnValueOnce(false); // isHardwareAccount(address, [qr])

      const result = getHardwareWalletTypeForAddress(testAddress);
      expect(result).toBeUndefined();
    });

    it('checks Ledger first before QR', () => {
      // Both return true - should return Ledger since it's checked first
      mockIsHardwareAccount.mockReturnValue(true);

      const result = getHardwareWalletTypeForAddress(testAddress);
      expect(result).toBe(HardwareWalletType.Ledger);
    });
  });
});
