import BigNumber from 'bignumber.js';

import {
  fromMYXPrice,
  toMYXPrice,
  fromMYXSize,
  toMYXSize,
  fromMYXCollateral,
  getMYXChainId,
  getMYXHttpEndpoint,
  MYX_SIZE_DECIMALS,
} from './myxConfig';

describe('myxConfig', () => {
  describe('fromMYXPrice', () => {
    it('parses a normal float price string', () => {
      expect(fromMYXPrice('1000')).toBe(1000);
    });

    it('returns 0 for "0"', () => {
      expect(fromMYXPrice('0')).toBe(0);
    });

    it('returns 0 for empty string', () => {
      expect(fromMYXPrice('')).toBe(0);
    });

    it('parses a realistic BTC price from MYX API', () => {
      // MYX API returns normal float strings like "64854.760266796727"
      expect(fromMYXPrice('64854.760266796727')).toBeCloseTo(64854.76, 2);
    });

    it('parses a sub-dollar price', () => {
      // MYX token price ≈ $0.39
      expect(fromMYXPrice('0.390062307787905')).toBeCloseTo(0.39, 2);
    });

    it('returns 0 for invalid string', () => {
      expect(fromMYXPrice('not-a-number')).toBe(0);
    });
  });

  describe('toMYXPrice', () => {
    it('converts a number to string', () => {
      expect(toMYXPrice(1000)).toBe('1000');
    });

    it('converts a string input', () => {
      expect(toMYXPrice('2500.5')).toBe('2500.5');
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
    it('returns 59141 (Linea Sepolia) for testnet', () => {
      expect(getMYXChainId('testnet')).toBe(59141);
    });

    it('returns 56 (BNB) for mainnet', () => {
      expect(getMYXChainId('mainnet')).toBe(56);
    });
  });

  describe('getMYXHttpEndpoint', () => {
    it('returns testnet URL for testnet', () => {
      expect(getMYXHttpEndpoint('testnet')).toBe('https://api-test.myx.cash');
    });

    it('returns prod URL for mainnet', () => {
      expect(getMYXHttpEndpoint('mainnet')).toBe('https://api.myx.finance');
    });
  });
});
