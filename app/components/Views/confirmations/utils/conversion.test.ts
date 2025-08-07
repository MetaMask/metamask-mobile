import { convertHexBalanceToDecimal } from './conversion';

describe('convertHexBalanceToDecimal', () => {
  describe('when hex balance is zero or empty', () => {
    it('returns "0" for empty string', () => {
      const hexBalance = '';
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('0');
    });

    it('returns "0" for "0x0"', () => {
      const hexBalance = '0x0';
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('0');
    });

    it('returns "0" for "0"', () => {
      const hexBalance = '0';
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('0');
    });

    it('returns "0" for null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hexBalance = null as any;
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('0');
    });

    it('returns "0" for undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hexBalance = undefined as any;
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('0');
    });
  });

  describe('when hex balance represents a positive value', () => {
    it('converts 1 ETH (18 decimals) correctly', () => {
      const hexBalance = '0xde0b6b3a7640000';
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('1');
    });

    it('converts 0.5 ETH (18 decimals) correctly', () => {
      const hexBalance = '0x6f05b59d3b20000';
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('0.5');
    });

    it('converts 1.5 tokens with 6 decimals correctly', () => {
      const hexBalance = '0x16e360';
      const decimals = 6;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('1.5');
    });

    it('converts large amounts correctly', () => {
      const hexBalance = '0x43c33c1937564800000';
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('20000');
    });

    it('handles tokens with 0 decimals correctly', () => {
      const hexBalance = '0x64';
      const decimals = 0;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('100');
    });
  });

  describe('edge cases', () => {
    it('handles hex values without 0x prefix', () => {
      const hexBalance = 'de0b6b3a7640000';
      const decimals = 18;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('1');
    });

    it('handles exact decimal division', () => {
      const hexBalance = '0x2710';
      const decimals = 4;

      const result = convertHexBalanceToDecimal(hexBalance, decimals);

      expect(result).toBe('1');
    });
  });
});
