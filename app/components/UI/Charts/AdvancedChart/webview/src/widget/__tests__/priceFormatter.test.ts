/**
 * @jest-environment jsdom
 */
import {
  advancedChartPriceFormatterFactory,
  formatCrosshairPrice,
  formatSubscriptNotation,
} from '../priceFormatter';
import type { ChartConfig } from '../../core/types';

describe('formatSubscriptNotation', () => {
  it('returns null for values outside (0, 0.0001)', () => {
    expect(formatSubscriptNotation(0)).toBeNull();
    expect(formatSubscriptNotation(0.001)).toBeNull();
    expect(formatSubscriptNotation(1)).toBeNull();
    expect(formatSubscriptNotation(-1)).toBeNull();
  });

  it('produces 0.0₄1234 for 0.00001234', () => {
    // 0.00001234 → 4 leading zeros after "0.0"
    expect(formatSubscriptNotation(0.00001234)).toBe('0.0₄1234');
  });

  it('collapses trailing zeros in the significant slice', () => {
    // 0.000012 → sig "12" (after slicing 4 chars would be "1200", trim → "12")
    expect(formatSubscriptNotation(0.000012)).toBe('0.0₄12');
  });
});

describe('formatCrosshairPrice', () => {
  it('handles nullish + NaN', () => {
    expect(formatCrosshairPrice(null)).toBe('');
    expect(formatCrosshairPrice(undefined)).toBe('');
    expect(formatCrosshairPrice(NaN)).toBe('');
    expect(formatCrosshairPrice('not-a-number')).toBe('');
  });

  it('renders zero as "0.00"', () => {
    expect(formatCrosshairPrice(0)).toBe('0.00');
  });

  it('uses subscript notation for tiny values', () => {
    expect(formatCrosshairPrice(0.00001234)).toBe('0.0₄1234');
    expect(formatCrosshairPrice(-0.00001234)).toBe('-0.0₄1234');
  });

  it('uses 2 fraction digits for values >= 1', () => {
    expect(formatCrosshairPrice(1234.5678)).toBe('1,234.57');
    expect(formatCrosshairPrice(1)).toBe('1.00');
  });

  it('uses 4 fraction digits for values < 1', () => {
    expect(formatCrosshairPrice(0.12345)).toBe('0.1235');
  });
});

describe('advancedChartPriceFormatterFactory', () => {
  afterEach(() => {
    delete (window as unknown as { CONFIG?: ChartConfig }).CONFIG;
  });

  it('returns null when symbolInfo is null', () => {
    (window as unknown as { CONFIG: Partial<ChartConfig> }).CONFIG = {
      useSubscriptPriceFormat: true,
    };
    expect(advancedChartPriceFormatterFactory(null, 0)).toBeNull();
  });

  it('returns null for volume symbol', () => {
    (window as unknown as { CONFIG: Partial<ChartConfig> }).CONFIG = {
      useSubscriptPriceFormat: true,
    };
    expect(
      advancedChartPriceFormatterFactory({ format: 'volume' }, 0),
    ).toBeNull();
  });

  it('returns null when useSubscriptPriceFormat is off', () => {
    (window as unknown as { CONFIG: Partial<ChartConfig> }).CONFIG = {
      useSubscriptPriceFormat: false,
    };
    expect(advancedChartPriceFormatterFactory({}, 0)).toBeNull();
  });

  it('returns a formatter routing through formatCrosshairPrice', () => {
    (window as unknown as { CONFIG: Partial<ChartConfig> }).CONFIG = {
      useSubscriptPriceFormat: true,
    };
    const formatter = advancedChartPriceFormatterFactory({}, 0);
    expect(formatter).not.toBeNull();
    expect(formatter?.format(0.00001234)).toBe('0.0₄1234');
    expect(formatter?.format(1234.56)).toBe('1,234.56');
  });
});
