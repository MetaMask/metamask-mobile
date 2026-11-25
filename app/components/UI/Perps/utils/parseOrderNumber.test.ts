import { parseOrderNumber, parseOrderPrice } from './parseOrderNumber';

describe('parseOrderNumber', () => {
  it.each([
    ['undefined', undefined],
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['a non-numeric string', '2oops'],
    ['an infinite number', 'Infinity'],
    ['-Infinity', '-Infinity'],
  ] as const)('returns undefined for %s', (_label, input) => {
    expect(parseOrderNumber(input)).toBeUndefined();
  });

  it('parses a plain integer string', () => {
    expect(parseOrderNumber('42')).toBe(42);
  });

  it('parses scientific notation', () => {
    expect(parseOrderNumber('1e3')).toBe(1000);
  });

  it('preserves a valid zero — absent is not zero', () => {
    expect(parseOrderNumber('0')).toBe(0);
  });

  it('parses a negative number', () => {
    expect(parseOrderNumber('-1.5')).toBe(-1.5);
  });
});

describe('parseOrderPrice', () => {
  it('returns undefined for blank input', () => {
    expect(parseOrderPrice('  ')).toBeUndefined();
  });

  it('returns undefined for a malformed number', () => {
    expect(parseOrderPrice('2oops')).toBeUndefined();
  });

  it('parses scientific notation prices above zero', () => {
    expect(parseOrderPrice('1e3')).toBe(1000);
  });

  it('returns undefined for Infinity', () => {
    expect(parseOrderPrice('Infinity')).toBeUndefined();
  });

  it('rejects zero — zero is valid for a fee, not a price', () => {
    expect(parseOrderPrice('0')).toBeUndefined();
  });

  it('keeps a positive price', () => {
    expect(parseOrderPrice('2999.5')).toBe(2999.5);
  });
});
