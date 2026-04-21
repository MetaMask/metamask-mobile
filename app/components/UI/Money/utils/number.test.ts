import { isPositiveNumber } from './number';

describe('isPositiveNumber', () => {
  describe('returns true for positive finite numbers', () => {
    it.each([
      ['a positive integer', 1],
      ['a positive decimal', 0.01],
      ['Number.MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER],
    ])('returns true for %s', (_label, value) => {
      const result = isPositiveNumber(value);

      expect(result).toBe(true);
    });
  });

  describe('returns false for non-number types', () => {
    it.each([
      ['a numeric string', '1'],
      ['null', null],
      ['undefined', undefined],
      ['a boolean', true],
      ['an array', [1]],
      ['an object', { value: 1 }],
    ])('returns false for %s', (_label, value) => {
      const result = isPositiveNumber(value);

      expect(result).toBe(false);
    });
  });

  describe('returns false for non-finite numbers', () => {
    it.each([
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
      ['NaN', NaN],
    ])('returns false for %s', (_label, value) => {
      const result = isPositiveNumber(value);

      expect(result).toBe(false);
    });
  });

  describe('returns false for zero and negative numbers', () => {
    it.each([
      ['zero', 0],
      ['a negative integer', -1],
      ['a negative decimal', -0.01],
    ])('returns false for %s', (_label, value) => {
      const result = isPositiveNumber(value);

      expect(result).toBe(false);
    });
  });
});
