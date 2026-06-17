import {
  formatUsd,
  formatSignedUsd,
  formatSignedAbbreviatedUsd,
  formatSignedFullUsdNoDecimals,
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

describe('formatSignedUsd', () => {
  it('prefixes positive values with +', () => {
    expect(formatSignedUsd(1234.5)).toBe('+$1,234.50');
  });

  it('prefixes negative values with -', () => {
    expect(formatSignedUsd(-150.5)).toBe('-$150.50');
  });

  it('renders zero without a sign', () => {
    expect(formatSignedUsd(0)).toBe('$0.00');
  });

  it('formats small fractional amounts with two decimal places', () => {
    expect(formatSignedUsd(0.12)).toBe('+$0.12');
  });

  it('returns an em dash for null and undefined', () => {
    expect(formatSignedUsd(null)).toBe('\u2014');
    expect(formatSignedUsd(undefined)).toBe('\u2014');
  });
});

describe('formatSignedAbbreviatedUsd', () => {
  it.each([
    [123, '+$123.00'],
    [999, '+$999.00'],
    [1_000, '+$1K'],
    [5_123, '+$5.1K'],
    [5_000, '+$5K'],
    [20_610, '+$20.6K'],
    [117_166, '+$117.2K'],
    [999_999, '+$1M'],
    [1_170_000, '+$1.2M'],
    [3_200_000_000, '+$3.2B'],
    [1.5e12, '+$1.5T'],
  ])('formats %d as %s', (input, expected) => {
    expect(formatSignedAbbreviatedUsd(input)).toBe(expected);
  });

  it('prefixes negative values with -', () => {
    expect(formatSignedAbbreviatedUsd(-5_000)).toBe('-$5K');
    expect(formatSignedAbbreviatedUsd(-1_170_000)).toBe('-$1.2M');
    expect(formatSignedAbbreviatedUsd(-500.24)).toBe('-$500.24');
  });

  it('renders zero without a sign', () => {
    expect(formatSignedAbbreviatedUsd(0)).toBe('$0.00');
  });

  it('shows two decimal places for sub-$1K values', () => {
    expect(formatSignedAbbreviatedUsd(500.236)).toBe('+$500.24');
    expect(formatSignedAbbreviatedUsd(0.5)).toBe('+$0.50');
  });

  it('returns an em dash for null and undefined', () => {
    expect(formatSignedAbbreviatedUsd(null)).toBe('\u2014');
    expect(formatSignedAbbreviatedUsd(undefined)).toBe('\u2014');
  });
});

describe('formatSignedFullUsdNoDecimals', () => {
  it('formats the full number with commas and no decimals, signed', () => {
    expect(formatSignedFullUsdNoDecimals(82610666)).toBe('+$82,610,666');
  });

  it('rounds away fractional digits', () => {
    expect(formatSignedFullUsdNoDecimals(782360.66)).toBe('+$782,361');
  });

  it('prefixes negative values with -', () => {
    expect(formatSignedFullUsdNoDecimals(-1234)).toBe('-$1,234');
  });

  it('renders zero without a sign', () => {
    expect(formatSignedFullUsdNoDecimals(0)).toBe('$0');
  });

  it('returns an em dash for null and undefined', () => {
    expect(formatSignedFullUsdNoDecimals(null)).toBe('\u2014');
    expect(formatSignedFullUsdNoDecimals(undefined)).toBe('\u2014');
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

  it('caps decimals at 5 for small values below 1,000', () => {
    expect(formatTokenAmount(1.5)).toBe('1.5');
  });

  it('caps decimals at 5 and strips trailing zeros for values below 1,000', () => {
    expect(formatTokenAmount(1.23456789)).toBe('1.23457');
  });

  it('correctly displays values just above the dust threshold', () => {
    expect(formatTokenAmount(0.00003)).toBe('0.00003');
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
  it('formats a millisecond timestamp as "MMM D at h:mm am/pm"', () => {
    const result = formatTradeDate(1744732800000);
    expect(result).toMatch(
      /^[A-Z][a-z]{2,3} \d{1,2} at \d{1,2}:\d{2} (am|pm)$/,
    );
  });

  it('converts a seconds timestamp to milliseconds before formatting', () => {
    const seconds = 1744732800;
    const ms = 1744732800000;
    expect(formatTradeDate(seconds)).toBe(formatTradeDate(ms));
  });

  it('renders am/pm in lowercase', () => {
    const result = formatTradeDate(1744732800000);
    expect(result).not.toMatch(/AM|PM/);
    expect(result).toMatch(/am|pm/);
  });

  it('uses a short (3-letter) month abbreviation, not the full name', () => {
    const result = formatTradeDate(1744732800000);
    expect(result).not.toMatch(
      /January|February|March|April|May|June|July|August|September|October|November|December/,
    );
  });

  it('omits the year', () => {
    const result = formatTradeDate(1744732800000);
    expect(result).not.toMatch(/20\d{2}/);
  });
});
