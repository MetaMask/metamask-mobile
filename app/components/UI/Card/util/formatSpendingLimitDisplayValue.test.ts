import { formatSpendingLimitDisplayValue } from './formatSpendingLimitDisplayValue';

describe('formatSpendingLimitDisplayValue', () => {
  it('formats whole and large values without decimals', () => {
    expect(formatSpendingLimitDisplayValue(1000)).toBe('1000');
    expect(formatSpendingLimitDisplayValue(500)).toBe('500');
  });

  it('keeps two decimals for ordinary fractional values', () => {
    expect(formatSpendingLimitDisplayValue(123.45)).toBe('123.45');
    expect(formatSpendingLimitDisplayValue(0.5)).toBe('0.5');
  });

  it('keeps six decimals for sub-cent values', () => {
    expect(formatSpendingLimitDisplayValue(0.000123)).toBe('0.000123');
  });

  it('drops trailing zeros', () => {
    expect(formatSpendingLimitDisplayValue(150.0)).toBe('150');
    expect(formatSpendingLimitDisplayValue(0.5)).toBe('0.5');
  });

  it('formats zero as a plain zero', () => {
    expect(formatSpendingLimitDisplayValue(0)).toBe('0');
  });
});
