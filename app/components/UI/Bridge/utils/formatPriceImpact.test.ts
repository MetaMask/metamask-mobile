import { formatPriceImpact } from './formatPriceImpact';

describe('formatPriceImpact', () => {
  it('returns "0" when called with undefined', () => {
    expect(formatPriceImpact(undefined)).toBe('0');
  });

  it('returns "0" when called with an empty string', () => {
    expect(formatPriceImpact('')).toBe('0');
  });

  it('returns "0%" when value is zero', () => {
    expect(formatPriceImpact('0%')).toBe('0%');
  });

  it('returns "0%" when value is negative', () => {
    expect(formatPriceImpact('-1.5%')).toBe('0%');
  });

  it('returns "0%" for a negative value without percent sign', () => {
    expect(formatPriceImpact('-3')).toBe('0%');
  });

  it('appends "%" when given a positive numeric string without percent sign', () => {
    expect(formatPriceImpact('2.5')).toBe('2.5%');
  });

  it('preserves the value and appends "%" when given a positive value with percent sign', () => {
    expect(formatPriceImpact('3.14%')).toBe('3.14%');
  });

  it('handles whole number positive values', () => {
    expect(formatPriceImpact('5%')).toBe('5%');
  });

  it('handles very small positive values', () => {
    expect(formatPriceImpact('0.01%')).toBe('0.01%');
  });
});
