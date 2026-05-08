import { TextColor } from '@metamask/design-system-react-native';
import {
  formatPrice,
  formatPercentageChange,
  formatAssetPrice,
} from './formatAssetPrice';

describe('formatPrice', () => {
  it('formats a USD price with 2 decimal places', () => {
    expect(formatPrice(1.0, 'USD')).toBe('$1.00');
  });

  it('formats a large USD price with comma separators', () => {
    const result = formatPrice(95000, 'USD');
    expect(result).toBe('$95,000.00');
  });

  it('handles fractional cents', () => {
    const result = formatPrice(0.9998, 'USD');
    expect(result).toBe('$1.00');
  });

  it('falls back to plain format for invalid currency codes', () => {
    const result = formatPrice(100, 'INVALID_CURRENCY_XYZ');
    // Should not throw; returns a fallback string
    expect(result).toBeTruthy();
    expect(result).toContain('100');
  });
});

describe('formatPercentageChange', () => {
  it('returns dash text and alternative color when change is undefined', () => {
    const { text, color } = formatPercentageChange(undefined);
    expect(text).toBeUndefined();
    expect(color).toBe(TextColor.TextAlternative);
  });

  it('returns positive sign and success color for positive change', () => {
    const { text, color } = formatPercentageChange(3.45);
    expect(text).toBe('+3.45%');
    expect(color).toBe(TextColor.SuccessDefault);
  });

  it('returns negative sign and error color for negative change', () => {
    const { text, color } = formatPercentageChange(-1.23);
    expect(text).toBe('-1.23%');
    expect(color).toBe(TextColor.ErrorDefault);
  });

  it('returns alternative color for zero change', () => {
    const { text, color } = formatPercentageChange(0);
    expect(text).toBe('+0.00%');
    expect(color).toBe(TextColor.TextAlternative);
  });

  it('returns undefined text and alternative color for NaN', () => {
    const { text, color } = formatPercentageChange(NaN);
    expect(text).toBeUndefined();
    expect(color).toBe(TextColor.TextAlternative);
  });

  it('returns undefined text and alternative color for Infinity', () => {
    const { text, color } = formatPercentageChange(Infinity);
    expect(text).toBeUndefined();
    expect(color).toBe(TextColor.TextAlternative);
  });
});

describe('formatAssetPrice', () => {
  it('returns dash when price is undefined', () => {
    const result = formatAssetPrice(undefined, undefined, 'USD');
    expect(result.priceText).toBe('—');
    expect(result.changeText).toBeUndefined();
    expect(result.changeColor).toBe(TextColor.TextAlternative);
  });

  it('returns formatted price with undefined change when change is undefined', () => {
    const result = formatAssetPrice(100, undefined, 'USD');
    expect(result.priceText).toBe('$100.00');
    expect(result.changeText).toBeUndefined();
  });

  it('returns formatted price and positive change with success color', () => {
    const result = formatAssetPrice(95000, 2.5, 'USD');
    expect(result.priceText).toBe('$95,000.00');
    expect(result.changeText).toBe('+2.50%');
    expect(result.changeColor).toBe(TextColor.SuccessDefault);
  });

  it('returns formatted price and negative change with error color', () => {
    const result = formatAssetPrice(95000, -1.23, 'USD');
    expect(result.priceText).toBe('$95,000.00');
    expect(result.changeText).toBe('-1.23%');
    expect(result.changeColor).toBe(TextColor.ErrorDefault);
  });

  it('returns dash when price is NaN', () => {
    const result = formatAssetPrice(NaN, 1, 'USD');
    expect(result.priceText).toBe('—');
  });

  it('returns dash when price is null-like undefined', () => {
    const result = formatAssetPrice(null as unknown as undefined, 0, 'USD');
    expect(result.priceText).toBe('—');
  });
});
