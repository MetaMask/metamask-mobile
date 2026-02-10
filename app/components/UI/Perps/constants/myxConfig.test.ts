import BigNumber from 'bignumber.js';
import {
  fromMYXPrice,
  toMYXPrice,
  fromMYXSize,
  toMYXSize,
  fromMYXCollateral,
  getMYXChainId,
  getMYXHttpEndpoint,
  MYX_PRICE_DECIMALS,
  MYX_SIZE_DECIMALS,
} from './myxConfig';

describe('myxConfig', () => {
  describe('fromMYXPrice', () => {
    it('converts a 30-decimal price string to a number', () => {
      // 1000 * 10^30
      const myxPrice = new BigNumber(1000)
        .times(new BigNumber(10).pow(MYX_PRICE_DECIMALS))
        .toFixed(0);
      expect(fromMYXPrice(myxPrice)).toBe(1000);
    });

    it('returns 0 for "0"', () => {
      expect(fromMYXPrice('0')).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(fromMYXPrice('')).toBe(0);
    });

    it('converts a realistic BTC price', () => {
      // BTC ~65000 USD
      const myxPrice = new BigNumber(65000)
        .times(new BigNumber(10).pow(MYX_PRICE_DECIMALS))
        .toFixed(0);
      expect(fromMYXPrice(myxPrice)).toBe(65000);
    });

    it('returns 0 for invalid string', () => {
      expect(fromMYXPrice('not-a-number')).toBe(0);
    });
  });

  describe('toMYXPrice', () => {
    it('converts a number to 30-decimal price string', () => {
      const result = toMYXPrice(1000);
      const expected = new BigNumber(1000)
        .times(new BigNumber(10).pow(MYX_PRICE_DECIMALS))
        .toFixed(0);
      expect(result).toBe(expected);
    });

    it('converts a string input', () => {
      const result = toMYXPrice('2500.5');
      const expected = new BigNumber('2500.5')
        .times(new BigNumber(10).pow(MYX_PRICE_DECIMALS))
        .toFixed(0);
      expect(result).toBe(expected);
    });

    it('returns "0" for invalid string', () => {
      expect(toMYXPrice('invalid')).toBe('0');
    });
  });

  describe('fromMYXSize', () => {
    it('converts an 18-decimal size string to a number', () => {
      const myxSize = new BigNumber(5)
        .times(new BigNumber(10).pow(MYX_SIZE_DECIMALS))
        .toFixed(0);
      expect(fromMYXSize(myxSize)).toBe(5);
    });

    it('returns 0 for "0"', () => {
      expect(fromMYXSize('0')).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(fromMYXSize('')).toBe(0);
    });

    it('returns 0 for invalid string', () => {
      expect(fromMYXSize('xyz')).toBe(0);
    });
  });

  describe('toMYXSize', () => {
    it('converts a number to 18-decimal size string', () => {
      const result = toMYXSize(3);
      const expected = new BigNumber(3)
        .times(new BigNumber(10).pow(MYX_SIZE_DECIMALS))
        .toFixed(0);
      expect(result).toBe(expected);
    });

    it('converts a string input', () => {
      const result = toMYXSize('0.5');
      const expected = new BigNumber('0.5')
        .times(new BigNumber(10).pow(MYX_SIZE_DECIMALS))
        .toFixed(0);
      expect(result).toBe(expected);
    });

    it('returns "0" for invalid string', () => {
      expect(toMYXSize('bad')).toBe('0');
    });
  });

  describe('fromMYXCollateral', () => {
    it('converts an 18-decimal collateral string to a number', () => {
      // 18 decimals (same as size)
      const myxCollateral = new BigNumber(100)
        .times(new BigNumber(10).pow(18))
        .toFixed(0);
      expect(fromMYXCollateral(myxCollateral)).toBe(100);
    });

    it('returns 0 for "0"', () => {
      expect(fromMYXCollateral('0')).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(fromMYXCollateral('')).toBe(0);
    });

    it('returns 0 for invalid string', () => {
      expect(fromMYXCollateral('garbage')).toBe(0);
    });
  });

  describe('getMYXChainId', () => {
    it('returns 97 for testnet', () => {
      expect(getMYXChainId('testnet')).toBe(97);
    });

    it('returns 56 for mainnet', () => {
      expect(getMYXChainId('mainnet')).toBe(56);
    });
  });

  describe('getMYXHttpEndpoint', () => {
    it('returns beta URL for testnet', () => {
      expect(getMYXHttpEndpoint('testnet')).toBe(
        'https://api-beta.myx.finance',
      );
    });

    it('returns prod URL for mainnet', () => {
      expect(getMYXHttpEndpoint('mainnet')).toBe('https://api.myx.finance');
    });
  });
});
