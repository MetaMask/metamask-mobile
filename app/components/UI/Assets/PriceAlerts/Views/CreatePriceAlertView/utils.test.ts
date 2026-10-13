import { DECIMAL_PRECISION_CONFIG } from '@metamask/perps-controller';
import {
  formatKeypadDisplay,
  getKeypadDecimalPlaces,
  getPerpsKeypadDecimalPlaces,
  toKeypadString,
} from './utils';

describe('getPerpsKeypadDecimalPlaces', () => {
  it('returns MaxPriceDecimals minus szDecimals for BTC-style size decimals', () => {
    expect(getPerpsKeypadDecimalPlaces(5)).toBe(
      DECIMAL_PRECISION_CONFIG.MaxPriceDecimals - 5,
    );
  });

  it('returns 6 decimal places when szDecimals is 0', () => {
    expect(getPerpsKeypadDecimalPlaces(0)).toBe(6);
  });

  it('clamps negative results to 0', () => {
    expect(getPerpsKeypadDecimalPlaces(8)).toBe(0);
  });
});

describe('toKeypadString', () => {
  it('uses Hyperliquid tick precision when szDecimals is provided', () => {
    expect(toKeypadString(83714, 5)).toBe('83714');
    expect(toKeypadString(0.008764, 0)).toBe('0.008764');
  });

  it('keeps the log10 heuristic when szDecimals is omitted', () => {
    expect(toKeypadString(1201.98)).toBe('1201.98');
    expect(getKeypadDecimalPlaces(1201.98)).toBeGreaterThan(0);
  });
});

describe('formatKeypadDisplay', () => {
  it('groups the integer part with thousand separators', () => {
    expect(formatKeypadDisplay('84244')).toBe('84,244');
    expect(formatKeypadDisplay('1234567')).toBe('1,234,567');
  });

  it('leaves values below one thousand untouched', () => {
    expect(formatKeypadDisplay('999')).toBe('999');
    expect(formatKeypadDisplay('0.008764')).toBe('0.008764');
  });

  it('preserves an in-progress fraction exactly as typed', () => {
    expect(formatKeypadDisplay('84244.')).toBe('84,244.');
    expect(formatKeypadDisplay('84244.50')).toBe('84,244.50');
  });

  it('is idempotent so an already-grouped value round-trips', () => {
    expect(formatKeypadDisplay('84,244.50')).toBe('84,244.50');
  });
});
