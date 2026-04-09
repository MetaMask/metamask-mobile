import BigNumber from 'bignumber.js';
import { safeParseBigNumber } from './bignumber';

describe('safeParseBigNumber', () => {
  describe('valid numeric inputs', () => {
    it('parses a plain numeric string', () => {
      expect(safeParseBigNumber('123.45')).toEqual(new BigNumber('123.45'));
    });

    it('parses an integer string', () => {
      expect(safeParseBigNumber('1000')).toEqual(new BigNumber('1000'));
    });

    it('parses a number type', () => {
      expect(safeParseBigNumber(42)).toEqual(new BigNumber(42));
    });

    it('parses zero as a number', () => {
      expect(safeParseBigNumber(0)).toEqual(new BigNumber(0));
    });

    it('parses zero as a string', () => {
      expect(safeParseBigNumber('0')).toEqual(new BigNumber(0));
    });

    it('parses negative numbers', () => {
      expect(safeParseBigNumber('-99.5')).toEqual(new BigNumber('-99.5'));
    });
  });

  describe('comma-formatted strings', () => {
    it('strips commas from thousand-separated values', () => {
      expect(safeParseBigNumber('1,000.50')).toEqual(new BigNumber('1000.50'));
    });

    it('strips multiple commas', () => {
      expect(safeParseBigNumber('1,234,567')).toEqual(new BigNumber('1234567'));
    });

    it('strips commas with decimals', () => {
      expect(safeParseBigNumber('10,000.123456')).toEqual(
        new BigNumber('10000.123456'),
      );
    });
  });

  describe('invalid and edge-case inputs', () => {
    it('returns BigNumber(0) for undefined', () => {
      expect(safeParseBigNumber(undefined)).toEqual(new BigNumber(0));
    });

    it('returns BigNumber(0) for empty string', () => {
      expect(safeParseBigNumber('')).toEqual(new BigNumber(0));
    });

    it('returns BigNumber(0) for non-numeric string', () => {
      expect(safeParseBigNumber('abc')).toEqual(new BigNumber(0));
    });

    it('returns BigNumber(0) for NaN number', () => {
      expect(safeParseBigNumber(NaN)).toEqual(new BigNumber(0));
    });

    it('preserves Infinity (not treated as NaN)', () => {
      const result = safeParseBigNumber(Infinity);
      expect(result.isFinite()).toBe(false);
      expect(result.isNaN()).toBe(false);
    });
  });

  describe('precision', () => {
    it('preserves high-precision decimal strings', () => {
      const precise = '130.96926000000002';
      const result = safeParseBigNumber(precise);
      expect(result.toString()).toBe('130.96926000000002');
    });

    it('avoids floating-point addition errors via BigNumber', () => {
      const a = safeParseBigNumber('65.48463');
      const b = safeParseBigNumber('65.48463');
      expect(a.plus(b).toString()).toBe('130.96926');
    });
  });
});
