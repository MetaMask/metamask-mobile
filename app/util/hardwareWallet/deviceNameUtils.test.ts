import { sanitizeDeviceName } from './deviceNameUtils';

describe('sanitizeDeviceName', () => {
  describe('Ledger Flex devices', () => {
    it('returns "Ledger Flex" when device name is "Ledger Flex"', () => {
      const result = sanitizeDeviceName('Ledger Flex');

      expect(result).toBe('Ledger Flex');
    });

    it('returns "Ledger Flex" when device name includes version number', () => {
      const result = sanitizeDeviceName('Ledger Flex 1.0.0');

      expect(result).toBe('Ledger Flex');
    });

    it('returns "Ledger Flex" when device name includes additional text', () => {
      const result = sanitizeDeviceName('Ledger Flex Plus Edition');

      expect(result).toBe('Ledger Flex');
    });
  });

  describe('Ledger Nano X devices', () => {
    it('returns "Ledger Nano X" when device name is "Ledger Nano X"', () => {
      const result = sanitizeDeviceName('Ledger Nano X');

      expect(result).toBe('Ledger Nano X');
    });

    it('returns "Ledger Nano X" when device name includes version number', () => {
      const result = sanitizeDeviceName('Ledger Nano X 2.1.0');

      expect(result).toBe('Ledger Nano X');
    });

    it('returns "Ledger Nano X" when device name includes additional text', () => {
      const result = sanitizeDeviceName('Ledger Nano X Special Edition');

      expect(result).toBe('Ledger Nano X');
    });
  });

  describe('Ledger Nano devices', () => {
    it('returns "Ledger Nano" when device name is "Ledger Nano"', () => {
      const result = sanitizeDeviceName('Ledger Nano');

      expect(result).toBe('Ledger Nano');
    });

    it('returns "Ledger Nano" when device name is "Ledger Nano S"', () => {
      const result = sanitizeDeviceName('Ledger Nano S');

      expect(result).toBe('Ledger Nano');
    });

    it('returns "Ledger Nano" when device name is "Ledger Nano S Plus"', () => {
      const result = sanitizeDeviceName('Ledger Nano S Plus');

      expect(result).toBe('Ledger Nano');
    });

    it('returns "Ledger Nano" when device name includes version number', () => {
      const result = sanitizeDeviceName('Ledger Nano 1.6.1');

      expect(result).toBe('Ledger Nano');
    });
  });

  describe('non-Ledger devices', () => {
    it('returns original name for Keystone devices', () => {
      const result = sanitizeDeviceName('Keystone Pro');

      expect(result).toBe('Keystone Pro');
    });

    it('returns original name for AirGap Vault devices', () => {
      const result = sanitizeDeviceName('AirGap Vault');

      expect(result).toBe('AirGap Vault');
    });

    it('returns original name for other QR-based devices', () => {
      const result = sanitizeDeviceName('CoolWallet');

      expect(result).toBe('CoolWallet');
    });
  });

  describe('edge cases', () => {
    it('returns empty string when device name is undefined', () => {
      const result = sanitizeDeviceName(undefined);

      expect(result).toBe('');
    });

    it('returns empty string when device name is empty string', () => {
      const result = sanitizeDeviceName('');

      expect(result).toBe('');
    });

    it('returns original name when device name does not match known patterns', () => {
      const result = sanitizeDeviceName('Unknown Device');

      expect(result).toBe('Unknown Device');
    });
  });

  describe('priority order', () => {
    it('matches "Ledger Flex" before "Ledger Nano X"', () => {
      const result = sanitizeDeviceName('Ledger Flex X');

      expect(result).toBe('Ledger Flex');
    });

    it('matches "Ledger Nano X" before "Ledger Nano"', () => {
      const result = sanitizeDeviceName('Ledger Nano X S');

      expect(result).toBe('Ledger Nano X');
    });
  });
});
