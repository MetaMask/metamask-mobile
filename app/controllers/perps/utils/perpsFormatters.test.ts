import {
  formatFundingRate,
  formatPercentage,
  formatPerpsFiat,
  formatPnl,
  formatPositionSize,
  formatWithSignificantDigits,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
  PRICE_THRESHOLD,
} from './perpsFormatters';

// createFormatters uses Intl.NumberFormat under the hood — let it run for real
// but stub the import so the module-level call resolves synchronously.
jest.mock('@metamask/assets-controllers', () => ({
  createFormatters: (_opts: { locale: string }) => ({
    formatCurrency: (
      value: number,
      currency: string,
      opts: { minimumFractionDigits: number; maximumFractionDigits: number },
    ) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits,
        currencyDisplay: 'narrowSymbol',
      }).format(value),
  }),
}));

describe('PRICE_THRESHOLD', () => {
  it('exports expected boundary values', () => {
    expect(PRICE_THRESHOLD.VERY_HIGH).toBe(100_000);
    expect(PRICE_THRESHOLD.HIGH).toBe(10_000);
    expect(PRICE_THRESHOLD.LARGE).toBe(1_000);
    expect(PRICE_THRESHOLD.MEDIUM).toBe(100);
    expect(PRICE_THRESHOLD.MEDIUM_LOW).toBe(10);
    expect(PRICE_THRESHOLD.LOW).toBe(0.01);
    expect(PRICE_THRESHOLD.VERY_SMALL).toBe(0.000001);
  });
});

describe('PRICE_RANGES_MINIMAL_VIEW', () => {
  it('has two ranges', () => {
    expect(PRICE_RANGES_MINIMAL_VIEW).toHaveLength(2);
  });

  it('large range condition matches values >= 1000', () => {
    expect(PRICE_RANGES_MINIMAL_VIEW[0].condition(1000)).toBe(true);
    expect(PRICE_RANGES_MINIMAL_VIEW[0].condition(999)).toBe(false);
  });

  it('fallback range always matches', () => {
    expect(PRICE_RANGES_MINIMAL_VIEW[1].condition(0)).toBe(true);
    expect(PRICE_RANGES_MINIMAL_VIEW[1].condition(-999)).toBe(true);
  });
});

describe('PRICE_RANGES_UNIVERSAL', () => {
  it('has seven ranges', () => {
    expect(PRICE_RANGES_UNIVERSAL).toHaveLength(7);
  });

  it('very-high range condition matches values above 100000', () => {
    expect(PRICE_RANGES_UNIVERSAL[0].condition(100001)).toBe(true);
    expect(PRICE_RANGES_UNIVERSAL[0].condition(100000)).toBe(false);
  });

  it('very-small fallback always matches', () => {
    expect(PRICE_RANGES_UNIVERSAL[6].condition(0)).toBe(true);
  });
});

describe('formatWithSignificantDigits', () => {
  it('returns zero with no decimals for input 0', () => {
    expect(formatWithSignificantDigits(0, 4)).toEqual({
      value: 0,
      decimals: 0,
    });
  });

  it('respects minDecimals for zero', () => {
    expect(formatWithSignificantDigits(0, 4, 2)).toEqual({
      value: 0,
      decimals: 2,
    });
  });

  it('formats integer >= 1 with correct decimals for 5 sig figs', () => {
    // 123.456 has 3 integer digits → 5-3 = 2 decimals
    const result = formatWithSignificantDigits(123.456, 5);
    expect(result.decimals).toBe(2);
    expect(result.value).toBeCloseTo(123.46, 2);
  });

  it('formats large number with 0 decimals when significantDigits exceeded by integer digits', () => {
    // 123456 has 6 integer digits → 5-6 = negative → clamped to 0
    const result = formatWithSignificantDigits(123456, 5);
    expect(result.decimals).toBe(0);
  });

  it('formats decimal < 1 to correct sig figs', () => {
    // 0.003456 to 4 sig figs → 0.003456
    const result = formatWithSignificantDigits(0.003456, 4);
    expect(result.value).toBeCloseTo(0.003456, 6);
  });

  it('respects maxDecimals override', () => {
    // 12.34567 with 5 sig figs would need 4 decimals, capped at 2
    const result = formatWithSignificantDigits(12.34567, 5, undefined, 2);
    expect(result.decimals).toBe(2);
  });

  it('preserves negative sign for values < 1', () => {
    const result = formatWithSignificantDigits(-0.001234, 3);
    expect(result.value).toBeLessThan(0);
  });
});

describe('formatPerpsFiat', () => {
  it('returns fallback for NaN', () => {
    expect(formatPerpsFiat('not-a-number')).toBe('$---');
  });

  it('formats a basic value with default minimal view ranges', () => {
    // PRICE_RANGES_MINIMAL_VIEW: 2 decimals, fiat-style stripping
    expect(formatPerpsFiat(1234.56)).toBe('$1,234.56');
  });

  it('strips .00 with fiat-style stripping (default ranges)', () => {
    expect(formatPerpsFiat(1250)).toBe('$1,250');
    expect(formatPerpsFiat(100)).toBe('$100');
  });

  it('preserves meaningful decimals with fiat-style stripping', () => {
    // $13.40 → stays $13.40 (not $13.4)
    expect(formatPerpsFiat(13.4)).toBe('$13.40');
  });

  it('formats with PRICE_RANGES_UNIVERSAL', () => {
    // $12,345.67 → $12,346 (0 decimals, 5 sig figs for high range)
    const result = formatPerpsFiat(12345.67, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    expect(result).toBe('$12,346');
  });

  it('formats small value with universal ranges', () => {
    // $1.3445 → ~$1.3445 (5 sig figs, max 6 decimals)
    const result = formatPerpsFiat(1.3445, { ranges: PRICE_RANGES_UNIVERSAL });
    expect(result).toBe('$1.3445');
  });

  it('formats very small value with universal ranges', () => {
    // < $0.01 → 4 sig figs
    const result = formatPerpsFiat(0.004236, {
      ranges: PRICE_RANGES_UNIVERSAL,
    });
    expect(result).toBe('$0.004236');
  });

  it('respects explicit stripTrailingZeros: false', () => {
    const result = formatPerpsFiat(1250, { stripTrailingZeros: false });
    expect(result).toBe('$1,250.00');
  });

  it('handles numeric string input', () => {
    expect(formatPerpsFiat('500.50')).toBe('$500.50');
  });

  it('accepts custom currency', () => {
    const result = formatPerpsFiat(100, {
      currency: 'EUR',
      stripTrailingZeros: false,
    });
    expect(result).toContain('100');
  });
});

describe('formatPositionSize', () => {
  it('returns "0" for zero', () => {
    expect(formatPositionSize(0)).toBe('0');
  });

  it('returns "0" for NaN', () => {
    expect(formatPositionSize('invalid')).toBe('0');
  });

  it('uses szDecimals when provided', () => {
    expect(formatPositionSize(0.00009, 5)).toBe('0.00009');
    expect(formatPositionSize(44, 1)).toBe('44');
    expect(formatPositionSize(1.5, 5)).toBe('1.5');
  });

  it('strips trailing zeros with szDecimals', () => {
    expect(formatPositionSize(44.0, 2)).toBe('44');
  });

  it('uses magnitude logic for very small values (< 0.01) without szDecimals', () => {
    const result = formatPositionSize(0.00009);
    expect(result).toBe('0.00009');
  });

  it('uses magnitude logic for small values (< 1) without szDecimals', () => {
    expect(formatPositionSize(0.0024)).toBe('0.0024');
  });

  it('uses 2 decimals for values >= 1 without szDecimals', () => {
    expect(formatPositionSize(44)).toBe('44');
    expect(formatPositionSize(44.5)).toBe('44.5');
  });

  it('handles string input', () => {
    expect(formatPositionSize('1.23')).toBe('1.23');
  });
});

describe('formatPnl', () => {
  it('formats positive PnL with + prefix', () => {
    expect(formatPnl(1234.56)).toBe('+$1,234.56');
  });

  it('formats negative PnL with - prefix', () => {
    expect(formatPnl(-500)).toBe('-$500.00');
  });

  it('formats zero as positive', () => {
    expect(formatPnl(0)).toBe('+$0.00');
  });

  it('returns zero display for NaN', () => {
    expect(formatPnl('invalid')).toBe('$0.00');
  });

  it('handles string input', () => {
    expect(formatPnl('250.75')).toBe('+$250.75');
  });

  it('formats 2 decimal places always', () => {
    expect(formatPnl(100)).toBe('+$100.00');
    expect(formatPnl(-0.01)).toBe('-$0.01');
  });
});

describe('formatPercentage', () => {
  it('formats positive percentage with + prefix', () => {
    expect(formatPercentage(5.25)).toBe('+5.25%');
  });

  it('formats negative percentage with - prefix', () => {
    expect(formatPercentage(-2.75)).toBe('-2.75%');
  });

  it('formats zero as positive', () => {
    expect(formatPercentage(0)).toBe('+0.00%');
  });

  it('returns "0.00%" for NaN', () => {
    expect(formatPercentage('not-a-number')).toBe('0.00%');
  });

  it('respects custom decimals', () => {
    expect(formatPercentage(5.1234, 4)).toBe('+5.1234%');
    expect(formatPercentage(5.1234, 0)).toBe('+5%');
  });

  it('handles string input', () => {
    expect(formatPercentage('10.5')).toBe('+10.50%');
  });
});

describe('formatFundingRate', () => {
  it('returns zero display for undefined', () => {
    expect(formatFundingRate(undefined)).toBe('0.0000%');
  });

  it('returns zero display for null', () => {
    expect(formatFundingRate(null)).toBe('0.0000%');
  });

  it('formats positive funding rate as percentage', () => {
    // 0.0005 * 100 = 0.05 → "0.0500%"
    expect(formatFundingRate(0.0005)).toBe('0.0500%');
  });

  it('formats negative funding rate as percentage', () => {
    // -0.0001 * 100 = -0.01 → "-0.0100%"
    expect(formatFundingRate(-0.0001)).toBe('-0.0100%');
  });

  it('returns zero display for effectively-zero value', () => {
    expect(formatFundingRate(0)).toBe('0.0000%');
  });

  it('returns empty string for undefined when showZero is false', () => {
    expect(formatFundingRate(undefined, { showZero: false })).toBe('');
  });

  it('formats zero value normally when showZero is false (showZero only affects undefined/null)', () => {
    expect(formatFundingRate(0, { showZero: false })).toBe('0.0000%');
  });

  it('still formats non-zero when showZero is false', () => {
    expect(formatFundingRate(0.001, { showZero: false })).toBe('0.1000%');
  });
});
