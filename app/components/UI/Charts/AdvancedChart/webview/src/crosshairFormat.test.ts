import {
  toSubscriptDigits,
  formatSubscriptNotation,
  formatCrosshairPrice,
  formatCrosshairTime,
} from './crosshairFormat';

describe('toSubscriptDigits', () => {
  it('converts single digit', () => {
    expect(toSubscriptDigits(0)).toBe('₀');
    expect(toSubscriptDigits(5)).toBe('₅');
    expect(toSubscriptDigits(9)).toBe('₉');
  });

  it('converts multi-digit numbers', () => {
    expect(toSubscriptDigits(42)).toBe('₄₂');
    expect(toSubscriptDigits(107)).toBe('₁₀₇');
  });
});

describe('formatSubscriptNotation', () => {
  it('returns null for values >= 0.0001', () => {
    expect(formatSubscriptNotation(0.0001)).toBeNull();
    expect(formatSubscriptNotation(1.5)).toBeNull();
    expect(formatSubscriptNotation(100)).toBeNull();
  });

  it('returns null for zero and negative values', () => {
    expect(formatSubscriptNotation(0)).toBeNull();
    expect(formatSubscriptNotation(-0.00001)).toBeNull();
  });

  it('returns null when fewer than 4 leading zeros', () => {
    expect(formatSubscriptNotation(0.001)).toBeNull();
    expect(formatSubscriptNotation(0.0005)).toBeNull();
  });

  it('formats tiny prices with subscript zero-count', () => {
    // 0.0000000034 has 8 leading zeros after the decimal
    const result = formatSubscriptNotation(0.0000000034);
    expect(result).toMatch(/^0\.0₈/);
  });

  it('uses subscript notation for 4 leading zeros', () => {
    const result = formatSubscriptNotation(0.00001234);
    expect(result).not.toBeNull();
    expect(result).toContain('₄');
  });

  it('trims trailing zeros in significant digits', () => {
    const result = formatSubscriptNotation(0.00001);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^0\.0₄1$/);
  });
});

describe('formatCrosshairPrice', () => {
  it('returns empty string for undefined/null/NaN', () => {
    expect(formatCrosshairPrice(undefined)).toBe('');
    expect(formatCrosshairPrice(null)).toBe('');
    expect(formatCrosshairPrice(NaN)).toBe('');
    expect(formatCrosshairPrice('abc')).toBe('');
  });

  it('returns "0.00" for zero', () => {
    expect(formatCrosshairPrice(0)).toBe('0.00');
  });

  it('formats large prices with 2 decimal places', () => {
    expect(formatCrosshairPrice(1234.5)).toBe('1,234.50');
  });

  it('formats sub-dollar prices with up to 4 decimals', () => {
    expect(formatCrosshairPrice(0.1234)).toBe('0.1234');
  });

  it('formats prices >= 1 with exactly 2 decimals', () => {
    expect(formatCrosshairPrice(1.0)).toBe('1.00');
    expect(formatCrosshairPrice(99.999)).toBe('100.00');
  });

  it('uses subscript notation for tiny prices', () => {
    const result = formatCrosshairPrice(0.0000000034);
    expect(result).toContain('₈');
  });

  it('prefixes negative tiny prices with -', () => {
    const result = formatCrosshairPrice(-0.0000000034);
    expect(result).toMatch(/^-0\.0₈/);
  });

  it('accepts string numbers', () => {
    expect(formatCrosshairPrice('42.5')).toBe('42.50');
  });
});

describe('formatCrosshairTime', () => {
  it('returns empty string for undefined/null/NaN', () => {
    expect(formatCrosshairTime(undefined)).toBe('');
    expect(formatCrosshairTime(null)).toBe('');
    expect(formatCrosshairTime('abc')).toBe('');
  });

  it('formats a known timestamp correctly', () => {
    // 2024-01-15 14:30:00 UTC → Mon 15 Jan '24 14:30 (in UTC)
    const ts = Date.UTC(2024, 0, 15, 14, 30, 0) / 1000;
    const result = formatCrosshairTime(ts);
    expect(result).toContain('Mon');
    expect(result).toContain('15');
    expect(result).toContain('Jan');
    expect(result).toContain("'24");
  });

  it('pads hours and minutes with leading zeros', () => {
    // 2024-06-01 01:05:00 UTC
    const ts = Date.UTC(2024, 5, 1, 1, 5, 0) / 1000;
    const result = formatCrosshairTime(ts);
    expect(result).toMatch(/\d{2}:\d{2}$/);
  });

  it('accepts string numbers', () => {
    const ts = String(Date.UTC(2024, 0, 15, 12, 0, 0) / 1000);
    const result = formatCrosshairTime(ts);
    // Just verify it returns a non-empty formatted string (local TZ varies in CI)
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/\w+ \d+ \w+ '\d{2} \d{2}:\d{2}/);
  });
});
