import { formatSubscriptNotation } from './subscriptNotation';

describe('formatSubscriptNotation', () => {
  it('formats a very small number with subscript notation', () => {
    expect(formatSubscriptNotation(0.00000614)).toBe('0.0₅614');
  });

  it('formats number with many leading zeros', () => {
    expect(formatSubscriptNotation(0.0000000001234)).toBe('0.0₉1234');
  });

  it('trims trailing zeros from significant digits', () => {
    expect(formatSubscriptNotation(0.000001)).toBe('0.0₅1');
  });

  it('returns null for numbers >= 0.0001', () => {
    expect(formatSubscriptNotation(0.0001)).toBeNull();
    expect(formatSubscriptNotation(0.01)).toBeNull();
    expect(formatSubscriptNotation(1)).toBeNull();
  });

  it('returns null for zero and negative numbers', () => {
    expect(formatSubscriptNotation(0)).toBeNull();
    expect(formatSubscriptNotation(-0.00000614)).toBeNull();
  });

  it('returns null for NaN and Infinity', () => {
    expect(formatSubscriptNotation(NaN)).toBeNull();
    expect(formatSubscriptNotation(Infinity)).toBeNull();
    expect(formatSubscriptNotation(-Infinity)).toBeNull();
  });
});
