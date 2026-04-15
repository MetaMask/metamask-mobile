import { normalizeSourceAmountToMaxLength } from './normalizeSourceAmountToMaxLength';

describe('normalizeSourceAmountToMaxLength', () => {
  it('returns unchanged values that are already below the max input length', () => {
    expect(normalizeSourceAmountToMaxLength('12.34', 10)).toBe('12.34');
  });

  it('trims trailing zeros before applying the max input length', () => {
    expect(normalizeSourceAmountToMaxLength('1.2300', 10)).toBe('1.23');
  });

  it('reduces fractional precision until the value fits under the max input length', () => {
    expect(normalizeSourceAmountToMaxLength('0.123456789', 6)).toBe('0.1234');
  });

  it('drops the decimal separator when only the integer part can fit', () => {
    expect(normalizeSourceAmountToMaxLength('12345.67', 6)).toBe('12345');
  });

  it('drops decimals when the integer part alone exactly fits the max input length', () => {
    expect(normalizeSourceAmountToMaxLength('123456.7', 6)).toBe('123456');
  });

  it('preserves overly long integer values rather than truncating magnitude', () => {
    expect(normalizeSourceAmountToMaxLength('1234567.8', 6)).toBe('1234567.8');
  });
});
