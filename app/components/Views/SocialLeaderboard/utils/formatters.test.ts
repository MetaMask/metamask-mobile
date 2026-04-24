import {
  formatUsd,
  formatTokenAmount,
  formatPercent,
  formatTradeDate,
} from './formatters';

describe('formatUsd', () => {
  it('formats positive USD values with two decimal places', () => {
    expect(formatUsd(1234.5)).toBe('$1,234.50');
  });

  it('formats negative USD values with a leading minus', () => {
    expect(formatUsd(-150.5)).toBe('-$150.50');
  });

  it('formats zero as $0.00', () => {
    expect(formatUsd(0)).toBe('$0.00');
  });

  it('returns an em dash for null', () => {
    expect(formatUsd(null)).toBe('\u2014');
  });

  it('returns an em dash for undefined', () => {
    expect(formatUsd(undefined)).toBe('\u2014');
  });
});

describe('formatTokenAmount', () => {
  it('abbreviates billions (e.g. 1.5B)', () => {
    expect(formatTokenAmount(1500000000)).toBe('1.50B');
  });

  it('abbreviates millions (e.g. 216.65M)', () => {
    expect(formatTokenAmount(216649924.26742363)).toBe('216.65M');
  });

  it('abbreviates thousands (e.g. 63.21K)', () => {
    expect(formatTokenAmount(63213.6435416642)).toBe('63.21K');
  });

  it('abbreviates trillions (e.g. 1.50T)', () => {
    expect(formatTokenAmount(1500000000000)).toBe('1.50T');
  });

  it('caps decimals at 4 for small values below 1,000', () => {
    expect(formatTokenAmount(1.5)).toBe('1.5');
  });

  it('caps decimals at 4 and strips trailing zeros for values below 1,000', () => {
    expect(formatTokenAmount(1.23456789)).toBe('1.2346');
  });

  it('returns dust threshold string for very small positive values', () => {
    expect(formatTokenAmount(0.0000001)).toBe('< 0.00001');
  });

  it('returns 0 for zero input', () => {
    expect(formatTokenAmount(0)).toBe('0');
  });

  it('returns 0 for NaN input', () => {
    expect(formatTokenAmount(NaN)).toBe('0');
  });

  it('returns 0 for Infinity input', () => {
    expect(formatTokenAmount(Infinity)).toBe('0');
  });

  it('handles negative values below 1,000', () => {
    expect(formatTokenAmount(-500)).toBe('-500');
  });

  it('abbreviates large negative values', () => {
    expect(formatTokenAmount(-1500000000)).toBe('-1.50B');
  });
});

describe('formatPercent', () => {
  it('formats positive percent with plus sign', () => {
    expect(formatPercent(182)).toBe('+182%');
  });

  it('formats negative percent', () => {
    expect(formatPercent(-25)).toBe('-25%');
  });

  it('formats zero percent with plus sign', () => {
    expect(formatPercent(0)).toBe('+0%');
  });

  it('returns an em dash for null', () => {
    expect(formatPercent(null)).toBe('\u2014');
  });

  it('returns an em dash for undefined', () => {
    expect(formatPercent(undefined)).toBe('\u2014');
  });
});

describe('formatTradeDate', () => {
  it('formats a millisecond timestamp', () => {
    const ms = 1744732800000; // a known fixed date
    const result = formatTradeDate(ms);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('converts a seconds timestamp to milliseconds before formatting', () => {
    const seconds = 1744732800; // same date in seconds
    const ms = 1744732800000;
    expect(formatTradeDate(seconds)).toBe(formatTradeDate(ms));
  });
});
