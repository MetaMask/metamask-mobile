import {
  formatOhlcvVolumeDisplay,
  prefixVolumeWithCurrency,
} from './ohlcvBarVolumeFormat';

describe('prefixVolumeWithCurrency', () => {
  it('returns the string unchanged for USD', () => {
    expect(prefixVolumeWithCurrency('$1.23B', 'USD')).toBe('$1.23B');
    expect(prefixVolumeWithCurrency('-$1.00M', 'usd')).toBe('-$1.00M');
    expect(prefixVolumeWithCurrency('$---', 'USD')).toBe('$---');
  });

  it('replaces $ with € for EUR', () => {
    expect(prefixVolumeWithCurrency('$1.23B', 'EUR')).toBe('€1.23B');
    expect(prefixVolumeWithCurrency('-$1.00M', 'eur')).toBe('-€1.00M');
  });

  it('uses a numeric suffix when the currency has no symbol in the map', () => {
    expect(prefixVolumeWithCurrency('$500K', 'ZZZ')).toBe('500K ZZZ');
    expect(prefixVolumeWithCurrency('-$500K', 'ZZZ')).toBe('-500K ZZZ');
  });
});

describe('formatOhlcvVolumeDisplay', () => {
  it('formats volume with K/M/B/T and USD prefix via formatVolume', () => {
    expect(formatOhlcvVolumeDisplay(1234567890, 'USD')).toBe('$1.23B');
  });

  it('applies non-USD currency to formatVolume output', () => {
    expect(formatOhlcvVolumeDisplay(1234567890, 'EUR')).toBe('€1.23B');
  });

  it('returns $--- for NaN volume consistent with formatVolume', () => {
    expect(formatOhlcvVolumeDisplay(Number.NaN, 'USD')).toBe('$---');
  });
});
