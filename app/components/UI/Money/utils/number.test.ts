import {
  isPositiveNumber,
  isPositiveNumberOrZero,
  parseNonNegativeFinite,
} from './number';

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

describe('isPositiveNumberOrZero', () => {
  describe('returns true for positive finite numbers and zero', () => {
    it.each([
      ['a positive integer', 1],
      ['a positive decimal', 0.01],
      ['zero', 0],
      ['Number.MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER],
    ])('returns true for %s', (_label, value) => {
      const result = isPositiveNumberOrZero(value);

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
      const result = isPositiveNumberOrZero(value);

      expect(result).toBe(false);
    });
  });

  describe('returns false for non-finite numbers', () => {
    it.each([
      ['Infinity', Infinity],
      ['-Infinity', -Infinity],
      ['NaN', NaN],
    ])('returns false for %s', (_label, value) => {
      const result = isPositiveNumberOrZero(value);

      expect(result).toBe(false);
    });
  });

  describe('returns false for negative numbers', () => {
    it.each([
      ['a negative integer', -1],
      ['a negative decimal', -0.01],
    ])('returns false for %s', (_label, value) => {
      const result = isPositiveNumberOrZero(value);

      expect(result).toBe(false);
    });
  });
});

describe('parseNonNegativeFinite', () => {
  describe('returns numeric values for valid non-negative inputs', () => {
    it.each([
      { label: 'zero', raw: 0, expected: 0 },
      { label: 'positive integer', raw: 7, expected: 7 },
      { label: 'positive decimal', raw: 0.25, expected: 0.25 },
      {
        label: 'Number.MAX_SAFE_INTEGER',
        raw: Number.MAX_SAFE_INTEGER,
        expected: Number.MAX_SAFE_INTEGER,
      },
      { label: 'numeric string', raw: '1.5', expected: 1.5 },
      {
        label: 'numeric string with whitespace',
        raw: ' 2.75 ',
        expected: 2.75,
      },
      { label: 'scientific-notation string', raw: '1e-3', expected: 0.001 },
    ])('parses $label', ({ raw, expected }) => {
      const result = parseNonNegativeFinite(raw);

      expect(result).toBe(expected);
    });
  });

  describe('returns undefined for negative values', () => {
    it.each([
      { label: 'negative integer', raw: -1 },
      { label: 'negative decimal', raw: -0.5 },
      { label: 'negative numeric string', raw: '-2.25' },
    ])('returns undefined for $label', ({ raw }) => {
      const result = parseNonNegativeFinite(raw);

      expect(result).toBeUndefined();
    });
  });

  describe('returns undefined for non-finite and non-numeric values', () => {
    it.each([
      { label: 'Infinity', raw: Infinity },
      { label: '-Infinity', raw: -Infinity },
      { label: 'NaN', raw: NaN },
      { label: 'string Infinity', raw: 'Infinity' },
      { label: 'string NaN', raw: 'NaN' },
      { label: 'empty string', raw: '' },
      { label: 'whitespace string', raw: '   ' },
      { label: 'null', raw: null },
      { label: 'undefined', raw: undefined },
      { label: 'boolean', raw: true },
      { label: 'array', raw: [1] },
      { label: 'object', raw: { value: 1 } },
    ])('returns undefined for $label', ({ raw }) => {
      const result = parseNonNegativeFinite(raw);

      expect(result).toBeUndefined();
    });
  });
});
