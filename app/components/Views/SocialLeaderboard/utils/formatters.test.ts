import {
  formatUsd,
  formatSignedUsd,
  formatSignedAbbreviatedUsd,
  formatSignedFullUsdNoDecimals,
  formatTokenAmount,
  formatPercent,
  formatTradeDate,
  formatTradeTime,
  formatTradeDayLabel,
  formatFeedTimestamp,
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
  it('formats positive percent with plus sign and two decimals', () => {
    expect(formatPercent(182)).toBe('+182.00%');
  });

  it('formats negative percent', () => {
    expect(formatPercent(-25)).toBe('-25.00%');
  });

  it('formats zero percent with plus sign', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });

  it('returns an em dash for null', () => {
    expect(formatPercent(null)).toBe('\u2014');
  });

  it('returns an em dash for undefined', () => {
    expect(formatPercent(undefined)).toBe('\u2014');
  });

  it('omits the sign when showSign is false', () => {
    expect(formatPercent(182, { showSign: false })).toBe('182.00%');
    expect(formatPercent(-25, { showSign: false })).toBe('25.00%');
  });

  it('uses custom decimal places', () => {
    expect(formatPercent(1.234, { decimals: 0 })).toBe('+1%');
    expect(formatPercent(1.234, { decimals: 1 })).toBe('+1.2%');
  });

  it('uses a custom fallback for null', () => {
    expect(formatPercent(null, { fallback: '-' })).toBe('-');
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

describe('formatTradeTime', () => {
  it('formats a millisecond timestamp as "h:mm am/pm"', () => {
    const result = formatTradeTime(1744732800000);
    expect(result).toMatch(/^\d{1,2}:\d{2} (am|pm)$/);
  });

  it('converts a seconds timestamp to milliseconds before formatting', () => {
    const seconds = 1744732800;
    const ms = 1744732800000;
    expect(formatTradeTime(seconds)).toBe(formatTradeTime(ms));
  });

  it('renders am/pm in lowercase', () => {
    const result = formatTradeTime(1744732800000);
    expect(result).not.toMatch(/AM|PM/);
    expect(result).toMatch(/am|pm/);
  });

  it('omits the month and day', () => {
    const result = formatTradeTime(1744732800000);
    expect(result).not.toMatch(
      /January|February|March|April|May|June|July|August|September|October|November|December/,
    );
    expect(result).not.toMatch(
      /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/,
    );
    expect(result).not.toMatch(/ at /);
  });

  it('matches the clock portion of formatTradeDate', () => {
    const timestamp = 1744732800000;
    const datePart = formatTradeDate(timestamp);
    const timePart = formatTradeTime(timestamp);
    expect(datePart.endsWith(timePart)).toBe(true);
  });
});

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatFeedTimestamp', () => {
  const now = new Date('2026-07-09T12:00:00Z').getTime();

  it('formats seconds within the last minute', () => {
    expect(formatFeedTimestamp(now - 21 * SECOND, now)).toBe('21s');
  });

  it('formats minutes within the last hour', () => {
    expect(formatFeedTimestamp(now - 4 * MINUTE, now)).toBe('4m');
  });

  it('formats hours within the last day', () => {
    expect(formatFeedTimestamp(now - 3 * HOUR, now)).toBe('3h');
  });

  it('clamps future timestamps to 0 seconds', () => {
    expect(formatFeedTimestamp(now + 5 * SECOND, now)).toBe('0s');
  });

  it('formats an absolute clock time for timestamps older than 24h', () => {
    const result = formatFeedTimestamp(now - DAY - HOUR, now);
    expect(result).toMatch(/^\d{1,2}:\d{2} (am|pm)$/);
  });
});

describe('formatTradeDayLabel', () => {
  it('formats a full date label with localized month', () => {
    const label = formatTradeDayLabel(
      new Date('2026-07-01T15:00:00Z').getTime(),
    );
    expect(label).toMatch(/2026/u);
    expect(label).toMatch(/July|Jun|Jul/u);
  });
});
