import {
  LIMIT_ORDER_QUICK_PRICE_SIGNIFICANT_DIGITS,
  formatLimitOrderQuickPrice,
} from './formatLimitOrderQuickPrice';

describe('formatLimitOrderQuickPrice', () => {
  it('cuts fractional significant digits to 6 even when more decimals exist', () => {
    const result = formatLimitOrderQuickPrice('0.0034566512345');

    expect(result).toBe('0.00345665');
  });

  it('leaves a value with 6 or fewer fractional significant digits unchanged', () => {
    expect(formatLimitOrderQuickPrice('0.03')).toBe('0.03');
    expect(formatLimitOrderQuickPrice('123456')).toBe('123456');
  });

  it('leaves zero unchanged', () => {
    expect(formatLimitOrderQuickPrice('0')).toBe('0');
  });

  it('does not count the integer part towards the significant-digit budget', () => {
    const result = formatLimitOrderQuickPrice('2520.886748123');

    expect(result).toBe('2520.886748');
  });

  it('keeps a large integer part fully intact regardless of its digit count', () => {
    const result = formatLimitOrderQuickPrice('123456789.123456789');

    expect(result).toBe('123456789.123456');
  });

  it('truncates rather than rounds up', () => {
    // The 7th fractional digit is 9, which would round the 6th digit up if
    // rounding were used instead of truncation.
    const result = formatLimitOrderQuickPrice('1.23456789');

    expect(result).toBe('1.234567');
  });

  it('trims trailing zeros produced by truncation', () => {
    const result = formatLimitOrderQuickPrice('1.500000001');

    expect(result).toBe('1.5');
  });

  it('does not truncate a value with no fractional part', () => {
    expect(formatLimitOrderQuickPrice('2000')).toBe('2000');
  });

  it('returns undefined for undefined input', () => {
    expect(formatLimitOrderQuickPrice(undefined)).toBeUndefined();
  });

  it('returns the original value unchanged when it is not a finite number', () => {
    expect(formatLimitOrderQuickPrice('not-a-number')).toBe('not-a-number');
  });

  it('caps at 6 significant digits', () => {
    expect(LIMIT_ORDER_QUICK_PRICE_SIGNIFICANT_DIGITS).toBe(6);
  });
});
