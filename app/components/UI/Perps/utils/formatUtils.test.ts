/**
 * Unit tests for formatting utilities
 */

import {
  formatPerpsFiat,
  formatPnl,
  formatPercentage,
  formatLargeNumber,
  formatVolume,
  formatPositionSize,
  formatLeverage,
  parseCurrencyString,
  parsePercentageString,
  formatTransactionDate,
  formatDateSection,
  formatFundingRate,
  PRICE_RANGES_UNIVERSAL,
  PRICE_RANGES_MINIMAL_VIEW,
  formatPositiveFiat,
} from './formatUtils';
import { FUNDING_RATE_CONFIG } from '../constants/perpsConfig';

// Mock the formatWithThreshold utility
jest.mock('../../../../util/assets', () => ({
  formatWithThreshold: (
    value: number,
    _threshold: number,
    locale: string,
    options: Intl.NumberFormatOptions,
  ) => {
    const formatter = new Intl.NumberFormat(locale, options);
    return formatter.format(value);
  },
}));

// Mock the strings function
jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const mockStrings: Record<string, string> = {
      today: 'Today',
      'notifications.yesterday': 'Yesterday',
      'perps.today': 'Today',
      'perps.yesterday': 'Yesterday',
    };
    return mockStrings[key] || key;
  },
}));

describe('formatUtils', () => {
  describe('formatFundingRate', () => {
    it('displays zero display value when input is undefined', () => {
      // Given an undefined funding rate value
      const value = undefined;

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return the zero display constant
      expect(result).toBe(FUNDING_RATE_CONFIG.ZERO_DISPLAY);
    });

    it('displays zero display value when input is null', () => {
      // Given a null funding rate value
      const value = null;

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return the zero display constant
      expect(result).toBe(FUNDING_RATE_CONFIG.ZERO_DISPLAY);
    });

    it('formats positive funding rate correctly', () => {
      // Given a positive funding rate as decimal
      const value = 0.0005; // 0.05%

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return percentage with correct decimals
      expect(result).toBe('0.0500%');
    });

    it('formats negative funding rate correctly', () => {
      // Given a negative funding rate as decimal
      const value = -0.0001; // -0.01%

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return negative percentage with correct decimals
      expect(result).toBe('-0.0100%');
    });

    it('displays zero display value when input is exactly zero', () => {
      // Given a zero funding rate
      const value = 0;

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return the zero display constant
      expect(result).toBe(FUNDING_RATE_CONFIG.ZERO_DISPLAY);
    });

    it('formats very small positive funding rate correctly', () => {
      // Given a very small positive funding rate
      const value = 0.000001; // 0.0001%

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return the formatted percentage
      expect(result).toBe('0.0001%');
    });

    it('formats very small negative funding rate correctly', () => {
      // Given a very small negative funding rate
      const value = -0.000001; // -0.0001%

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return the formatted percentage
      expect(result).toBe('-0.0001%');
    });

    it('formats large positive funding rate correctly', () => {
      // Given a large positive funding rate
      const value = 0.01; // 1%

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return the formatted percentage
      expect(result).toBe('1.0000%');
    });

    it('formats large negative funding rate correctly', () => {
      // Given a large negative funding rate
      const value = -0.02; // -2%

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return the formatted percentage
      expect(result).toBe('-2.0000%');
    });

    it('returns empty string when showZero option is false and value is undefined', () => {
      // Given an undefined value with showZero set to false
      const value = undefined;
      const options = { showZero: false };

      // When formatting the funding rate
      const result = formatFundingRate(value, options);

      // Then it should return empty string
      expect(result).toBe('');
    });

    it('returns empty string when showZero option is false and value is null', () => {
      // Given a null value with showZero set to false
      const value = null;
      const options = { showZero: false };

      // When formatting the funding rate
      const result = formatFundingRate(value, options);

      // Then it should return empty string
      expect(result).toBe('');
    });

    it('displays zero display value when value rounds to zero', () => {
      // Given a value that rounds to zero with 4 decimals
      const value = 0.000000001; // Would round to 0.0000%

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should return the zero display constant
      expect(result).toBe(FUNDING_RATE_CONFIG.ZERO_DISPLAY);
    });

    it('handles number precision edge cases correctly', () => {
      // Given a value with many decimal places
      const value = 0.00054321; // 0.054321%

      // When formatting the funding rate
      const result = formatFundingRate(value);

      // Then it should round to configured decimal places
      expect(result).toBe('0.0543%');
    });
  });

  describe('formatPositiveFiat', () => {
    it('returns "$0" when fee is exactly zero', () => {
      // Given a fee of exactly zero
      const fee = 0;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it returns "$0"
      expect(result).toBe('$0');
    });

    it('returns "< $0.01" when fee is below threshold', () => {
      // Given a fee below the 0.01 threshold
      const fee = 0.005;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it returns "< $0.01"
      expect(result).toBe('< $0.01');
    });

    it('formats fee normally when exactly at 0.01 threshold', () => {
      // Given a fee at exactly the 0.01 threshold
      const fee = 0.01;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it formats normally
      expect(result).toBe('$0.01');
    });

    it('formats fee normally when above threshold', () => {
      // Given a fee above the 0.01 threshold
      const fee = 1.5;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it formats normally
      expect(result).toBe('$1.50');
    });

    it('returns "< $0.01" for very small positive fees', () => {
      // Given a very small positive fee
      const fee = 0.0001;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it returns "< $0.01"
      expect(result).toBe('< $0.01');
    });

    it('returns "< $0.01" for fee just below threshold', () => {
      // Given a fee just below the 0.01 threshold
      const fee = 0.0099;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it returns "< $0.01"
      expect(result).toBe('< $0.01');
    });

    it('formats fee normally when just above threshold', () => {
      // Given a fee just above the 0.01 threshold
      const fee = 0.0101;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it formats normally (rounded to $0.01)
      expect(result).toBe('$0.01');
    });

    it('formats large fees with proper decimals', () => {
      // Given a large fee value
      const fee = 123.45;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it formats with proper decimals
      expect(result).toBe('$123.45');
    });

    it('strips trailing zeros for whole number fees', () => {
      // Given a whole number fee
      const fee = 100;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then trailing zeros are stripped
      expect(result).toBe('$100');
    });

    it('handles fees with many decimal places', () => {
      // Given a fee with many decimal places
      const fee = 1.23456789;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it rounds appropriately
      expect(result).toBe('$1.23');
    });

    it('returns "$0" for negative zero', () => {
      // Given a negative zero value
      const fee = -0;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it returns "$0"
      expect(result).toBe('$0');
    });

    it('returns "< $0.01" for smallest representable positive fee', () => {
      // Given the smallest positive fee
      const fee = 0.00000001;

      // When formatting the fee
      const result = formatPositiveFiat(fee);

      // Then it returns "< $0.01"
      expect(result).toBe('< $0.01');
    });
  });

  describe('formatPerpsFiat', () => {
    it('should format balance with default 2 decimal places (fiat-style stripping)', () => {
      expect(formatPerpsFiat(1234.56)).toBe('$1,234.56'); // Has meaningful decimals: preserved
      expect(formatPerpsFiat('5000')).toBe('$5,000'); // No meaningful decimals: strips .00
      expect(formatPerpsFiat(100)).toBe('$100'); // No meaningful decimals: strips .00
      expect(formatPerpsFiat(100.5)).toBe('$100.50'); // Has meaningful decimals: preserved
    });

    it('should handle large numbers', () => {
      expect(formatPerpsFiat(1000000)).toBe('$1,000,000'); // >= $1000: strips trailing zeros
      expect(formatPerpsFiat(999999.99)).toBe('$999,999.99');
      expect(formatPerpsFiat('123456.789')).toBe('$123,456.79');
    });

    it('should handle small decimal values', () => {
      expect(formatPerpsFiat(0.1)).toBe('$0.10'); // < $1000: preserves trailing zeros
    });

    it('should return placeholder for NaN values', () => {
      expect(formatPerpsFiat('invalid')).toBe('$---');
      expect(formatPerpsFiat('')).toBe('$---');
      expect(formatPerpsFiat('abc')).toBe('$---');
    });

    describe('stripTrailingZeros option', () => {
      it('strips .00 by default (PRICE_RANGES_MINIMAL_VIEW with fiat-style)', () => {
        expect(formatPerpsFiat(1250, { minimumDecimals: 2 })).toBe('$1,250'); // Strips .00
        expect(formatPerpsFiat(100.0, { minimumDecimals: 2 })).toBe('$100'); // Strips .00
        expect(formatPerpsFiat(0, { minimumDecimals: 2 })).toBe('$0'); // Strips .00
        expect(formatPerpsFiat(100.1, { minimumDecimals: 2 })).toBe('$100.10'); // Preserves meaningful decimals
      });

      it('can be explicitly controlled via stripTrailingZeros option (only strips .00)', () => {
        expect(
          formatPerpsFiat(1250, {
            minimumDecimals: 2,
            stripTrailingZeros: true, // Explicitly enable stripping (only .00)
          }),
        ).toBe('$1,250');
        expect(
          formatPerpsFiat(100.0, {
            minimumDecimals: 2,
            stripTrailingZeros: true, // Explicitly enable stripping (only .00)
          }),
        ).toBe('$100');
        expect(
          formatPerpsFiat(100.1, {
            minimumDecimals: 2,
            stripTrailingZeros: true, // Preserves 2 decimals (not $100.1)
          }),
        ).toBe('$100.10');
        expect(
          formatPerpsFiat(0, { minimumDecimals: 2, stripTrailingZeros: true }),
        ).toBe('$0');
      });

      it('preserves meaningful decimals (never shows partial decimals)', () => {
        expect(formatPerpsFiat(1250.5, { minimumDecimals: 2 })).toBe(
          '$1,250.50', // >= $1000: preserves 2 decimals (never partial like $1,250.5)
        );
        expect(formatPerpsFiat(1250.05, { minimumDecimals: 2 })).toBe(
          '$1,250.05',
        );
        expect(formatPerpsFiat(1250.123, { maximumDecimals: 2 })).toBe(
          '$1,250.12',
        );
      });

      it('range-based trailing zero behavior (only strips .00)', () => {
        expect(formatPerpsFiat(1250.1, { minimumDecimals: 2 })).toBe(
          '$1,250.10', // >= $1000: preserves 2 decimals (not $1,250.1)
        );
        expect(formatPerpsFiat(1250.01, { minimumDecimals: 2 })).toBe(
          '$1,250.01',
        );
        expect(formatPerpsFiat(1250.1, { maximumDecimals: 3 })).toBe(
          '$1,250.10', // >= $1000: preserves 2 decimals (not $1,250.1)
        );
      });

      it('works with custom ranges', () => {
        // Custom range without stripTrailingZeros set will default to true (default behavior)
        expect(
          formatPerpsFiat(50000, {
            ranges: [
              {
                condition: () => true,
                minimumDecimals: 2,
                maximumDecimals: 2,
              },
            ],
          }),
        ).toBe('$50,000'); // Default: strips trailing zeros

        // Explicit stripTrailingZeros: false preserves trailing zeros
        expect(
          formatPerpsFiat(50000, {
            ranges: [
              {
                condition: () => true,
                minimumDecimals: 2,
                maximumDecimals: 2,
              },
            ],
            stripTrailingZeros: false,
          }),
        ).toBe('$50,000.00');
      });

      it('explicit options stripTrailingZeros overrides range config', () => {
        // Explicit options.stripTrailingZeros: false always wins (user intent)
        expect(
          formatPerpsFiat(1250, {
            ranges: [
              {
                condition: () => true,
                minimumDecimals: 2,
                maximumDecimals: 2,
                stripTrailingZeros: true,
              },
            ],
            stripTrailingZeros: false,
          }),
        ).toBe('$1,250.00'); // Options wins: preserves .00

        // Range config only matters when options.stripTrailingZeros is not explicitly set
        expect(
          formatPerpsFiat(1250, {
            ranges: [
              {
                condition: () => true,
                minimumDecimals: 2,
                maximumDecimals: 2,
                stripTrailingZeros: false,
              },
            ],
            // stripTrailingZeros not set at options level
          }),
        ).toBe('$1,250.00'); // Range config applied: preserves .00
      });
    });
  });

  describe('formatPerpsFiat with PRICE_RANGES_UNIVERSAL', () => {
    it('should format large whole numbers (trailing zeros stripped by default)', () => {
      expect(formatPerpsFiat(123456, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$123,456',
      );
      expect(formatPerpsFiat(121300, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$121,300',
      );
      expect(formatPerpsFiat(50000, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$50,000',
      );
    });

    it('should format large numbers following new decimal rules', () => {
      // > $10k: no decimals
      expect(formatPerpsFiat(121308, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$121,308',
      );
      expect(
        formatPerpsFiat(123456.78, { ranges: PRICE_RANGES_UNIVERSAL }),
      ).toBe('$123,457'); // Rounded, no decimals

      // $1k-$10k: 1 decimal max, 5 sig figs
      expect(formatPerpsFiat(4123.45, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$4,123.4',
      ); // 5 sig figs: 4,1,2,3,4 → 1 decimal
    });

    it('should format medium numbers following new decimal rules', () => {
      // $10-$100: max 4 decimals, 5 sig figs
      expect(formatPerpsFiat(56.123, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$56.123', // 5 sig figs: 5,6,1,2,3 = 3 decimals needed
      );

      // <= $10: 5 significant figures
      expect(formatPerpsFiat(2.875, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$2.875',
      );
      expect(formatPerpsFiat(1.234, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$1.234',
      );
    });

    it('should format small numbers with 4 sig figs', () => {
      // Task examples
      expect(formatPerpsFiat(0.1234, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$0.1234',
      );
      expect(formatPerpsFiat(0.01234, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$0.01234',
      );
    });

    it('should preserve precision and strip trailing zeros', () => {
      // Preserve higher precision (3+ decimals)
      expect(formatPerpsFiat(1.234, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$1.234',
      );
      // Keep natural 2 decimals
      expect(formatPerpsFiat(1.23, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$1.23',
      );
      // Strip trailing zero
      expect(formatPerpsFiat(10.5, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$10.5',
      );
    });

    it('should format zero (trailing zeros stripped)', () => {
      expect(formatPerpsFiat(0, { ranges: PRICE_RANGES_UNIVERSAL })).toBe('$0');
    });

    it('should handle edge cases', () => {
      // Very small numbers (<$0.01: 4 sig figs)
      expect(
        formatPerpsFiat(0.0001234, { ranges: PRICE_RANGES_UNIVERSAL }),
      ).toBe('$0.000123'); // 4 sig figs: 1,2,3,4

      // Numbers just below rounding threshold
      expect(formatPerpsFiat(999.99, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$999.99',
      );
      expect(formatPerpsFiat(1000, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
        '$1,000',
      );
    });

    it('should enforce 6 decimal cap for very small numbers', () => {
      // Rules: <$0.01 uses 4 sig figs with max 6 decimals
      // $0.0000012 has sig figs 1,2 → needs 4 sig figs → $0.000001 (rounded)
      expect(
        formatPerpsFiat(0.0000012, { ranges: PRICE_RANGES_UNIVERSAL }),
      ).toBe('$0.000001'); // 4 sig figs: 1,2,0,0 → rounds to $0.000001

      // Very small value that rounds to 0 after 6 decimal cap
      expect(
        formatPerpsFiat(0.00000045, { ranges: PRICE_RANGES_UNIVERSAL }),
      ).toBe('$0'); // Rounds to 0 with 6 decimal cap

      // Edge case: exactly at 6 decimal boundary
      expect(
        formatPerpsFiat(0.000001, { ranges: PRICE_RANGES_UNIVERSAL }),
      ).toBe('$0.000001'); // 1 sig fig at boundary

      // Example from rules-decimals.md: 0.0000004 → 0 (rounds down with cap)
      expect(
        formatPerpsFiat(0.0000004, { ranges: PRICE_RANGES_UNIVERSAL }),
      ).toBe('$0');
    });

    describe('PRICE_RANGES_UNIVERSAL boundary testing', () => {
      it('handles $10,000 exactly (boundary between 1 decimal and 0 decimal ranges)', () => {
        expect(formatPerpsFiat(10000, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          '$10,000',
        );
      });

      it('handles $10,000.01 (just above $10k boundary)', () => {
        expect(
          formatPerpsFiat(10000.01, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$10,000'); // Rounds to 0 decimals in >$10k range
      });

      it('handles $9,999.99 (just below $10k boundary)', () => {
        expect(
          formatPerpsFiat(9999.99, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$10,000'); // Rounds up with 1 decimal → $10,000
      });

      it('handles $100,000 exactly (high value boundary)', () => {
        expect(
          formatPerpsFiat(100000, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$100,000');
      });

      it('handles very small positive and negative values symmetrically', () => {
        const pos = formatPerpsFiat(0.001234, {
          ranges: PRICE_RANGES_UNIVERSAL,
        });
        const neg = formatPerpsFiat(-0.001234, {
          ranges: PRICE_RANGES_UNIVERSAL,
        });
        // Strip any potential comma from pos (though shouldn't be any) and add minus sign
        expect(neg).toBe(`-${pos.replace(/,/g, '')}`);
        // Verify the actual values
        expect(pos).toBe('$0.001234');
        expect(neg).toBe('-$0.001234');
      });
    });
  });

  describe('formatPnl', () => {
    it('should format positive PnL with + prefix', () => {
      expect(formatPnl(100)).toBe('+$100.00');
      expect(formatPnl('250.75')).toBe('+$250.75');
      expect(formatPnl(0)).toBe('+$0.00');
    });

    it('should format negative PnL with - prefix', () => {
      expect(formatPnl(-100)).toBe('-$100.00');
      expect(formatPnl('-250.75')).toBe('-$250.75');
    });

    it('should handle large numbers', () => {
      expect(formatPnl(123456.78)).toBe('+$123,456.78');
      expect(formatPnl(-987654.32)).toBe('-$987,654.32');
    });

    it('should handle invalid inputs', () => {
      expect(formatPnl('invalid')).toBe('$0.00');
      expect(formatPnl(NaN)).toBe('$0.00');
      expect(formatPnl('')).toBe('$0.00');
    });

    it('should round to 2 decimal places', () => {
      expect(formatPnl(100.999)).toBe('+$101.00');
      expect(formatPnl(-50.123)).toBe('-$50.12');
    });
  });

  describe('formatPercentage', () => {
    it('should format positive percentages with + prefix', () => {
      expect(formatPercentage(5.67)).toBe('+5.67%');
      expect(formatPercentage('10.5')).toBe('+10.50%');
      expect(formatPercentage(0)).toBe('+0.00%');
    });

    it('should format negative percentages', () => {
      expect(formatPercentage(-3.45)).toBe('-3.45%');
      expect(formatPercentage('-8.2')).toBe('-8.20%');
    });

    it('should handle large percentages', () => {
      expect(formatPercentage(150.789)).toBe('+150.79%');
      expect(formatPercentage(-99.999)).toBe('-100.00%');
    });

    it('should handle invalid inputs', () => {
      expect(formatPercentage('invalid')).toBe('0.00%');
      expect(formatPercentage(NaN)).toBe('0.00%');
      expect(formatPercentage('')).toBe('0.00%');
    });

    it('should round to 2 decimal places', () => {
      expect(formatPercentage(12.345)).toBe('+12.35%');
      expect(formatPercentage(-7.891)).toBe('-7.89%');
    });
  });

  describe('formatLargeNumber', () => {
    it('should format billions with B suffix (default no decimals)', () => {
      expect(formatLargeNumber(1000000000)).toBe('1B');
      expect(formatLargeNumber('2500000000')).toBe('3B');
      expect(formatLargeNumber(12300000000)).toBe('12B');
    });

    it('should format billions with configured decimals', () => {
      expect(formatLargeNumber(1000000000, { decimals: 1 })).toBe('1.0B');
      expect(formatLargeNumber('2500000000', { decimals: 1 })).toBe('2.5B');
      expect(formatLargeNumber(12300000000, { decimals: 2 })).toBe('12.30B');
    });

    it('should format millions with M suffix (default no decimals)', () => {
      expect(formatLargeNumber(1000000)).toBe('1M');
      expect(formatLargeNumber('2500000')).toBe('3M');
      expect(formatLargeNumber(123456789)).toBe('123M');
    });

    it('should format millions with configured decimals', () => {
      expect(formatLargeNumber(1000000, { decimals: 1 })).toBe('1.0M');
      expect(formatLargeNumber('2500000', { decimals: 1 })).toBe('2.5M');
      expect(formatLargeNumber(123456789, { decimals: 2 })).toBe('123.46M');
    });

    it('should format thousands with K suffix (default no decimals)', () => {
      expect(formatLargeNumber(1000)).toBe('1K');
      expect(formatLargeNumber('2500')).toBe('3K');
      expect(formatLargeNumber(123456)).toBe('123K');
    });

    it('should format thousands with configured decimals', () => {
      expect(formatLargeNumber(1000, { decimals: 1 })).toBe('1.0K');
      expect(formatLargeNumber('2500', { decimals: 2 })).toBe('2.50K');
      expect(formatLargeNumber(123456, { decimals: 1 })).toBe('123.5K');
    });

    it('should format numbers < 1000 with 2 decimal places by default', () => {
      expect(formatLargeNumber(999)).toBe('999.00');
      expect(formatLargeNumber('123.45')).toBe('123.45');
      expect(formatLargeNumber(0)).toBe('0.00');
    });

    it('should format numbers < 1000 with configured raw decimals', () => {
      expect(formatLargeNumber(999, { rawDecimals: 0 })).toBe('999');
      expect(formatLargeNumber('123.45', { rawDecimals: 3 })).toBe('123.450');
      expect(formatLargeNumber(0, { rawDecimals: 1 })).toBe('0.0');
    });

    it('should handle invalid inputs', () => {
      expect(formatLargeNumber('invalid')).toBe('0');
      expect(formatLargeNumber(NaN)).toBe('0');
      expect(formatLargeNumber('')).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatLargeNumber(-1000000)).toBe('-1M');
      expect(formatLargeNumber(-2500)).toBe('-3K');
      expect(formatLargeNumber(-999)).toBe('-999.00');
    });

    it('should handle negative numbers with decimals', () => {
      expect(formatLargeNumber(-1000000, { decimals: 1 })).toBe('-1.0M');
      expect(formatLargeNumber(-2500, { decimals: 2 })).toBe('-2.50K');
      expect(formatLargeNumber(-999, { rawDecimals: 0 })).toBe('-999');
    });

    it('should handle edge cases at boundaries', () => {
      expect(formatLargeNumber(999999999)).toBe('1000M');
      expect(formatLargeNumber(999999)).toBe('1000K');
      expect(formatLargeNumber(999.99)).toBe('999.99');
    });
  });

  describe('formatVolume', () => {
    it('should format volume with appropriate decimals by default', () => {
      expect(formatVolume(1234567890)).toBe('$1.23B'); // B: 2 decimals
      expect(formatVolume(12345678)).toBe('$12.35M'); // M: 2 decimals
      expect(formatVolume(123456)).toBe('$123K'); // K: 0 decimals
      expect(formatVolume(999)).toBe('$999.00'); // Under 1K: 2 decimals
    });

    it('should allow configurable decimals', () => {
      expect(formatVolume(1234567890, 0)).toBe('$1B');
      expect(formatVolume(12345678, 1)).toBe('$12.3M');
      expect(formatVolume(123456, 3)).toBe('$123.456K');
    });

    it('should handle zero volume', () => {
      expect(formatVolume(0)).toBe('$0.00');
      expect(formatVolume('0')).toBe('$0.00');
      expect(formatVolume(0, 0)).toBe('$0');
    });

    it('should handle invalid inputs', () => {
      expect(formatVolume('invalid')).toBe('$---');
      expect(formatVolume(NaN)).toBe('$---');
      expect(formatVolume(Infinity)).toBe('$---');
    });

    it('should handle negative volume', () => {
      expect(formatVolume(-1000000)).toBe('-$1.00M'); // M: 2 decimals
      expect(formatVolume(-1234)).toBe('-$1K'); // K: 0 decimals by default
      expect(formatVolume(-1234, 0)).toBe('-$1K'); // Explicit 0 decimals
    });

    it('should handle very large volumes', () => {
      expect(formatVolume(1000000000000)).toBe('$1.00T');
      expect(formatVolume(2500000000000)).toBe('$2.50T');
      expect(formatVolume(2500000000000, 0)).toBe('$3T');
    });
  });

  describe('formatPositionSize', () => {
    it('should format very small numbers without trailing zeros', () => {
      expect(formatPositionSize(0.001)).toBe('0.001');
      expect(formatPositionSize('0.0001')).toBe('0.0001');
      expect(formatPositionSize(-0.005)).toBe('-0.005');
      expect(formatPositionSize(0.00009)).toBe('0.00009'); // Task example
    });

    it('should format small numbers without trailing zeros', () => {
      expect(formatPositionSize(0.1234)).toBe('0.1234');
      expect(formatPositionSize('0.9999')).toBe('0.9999');
      expect(formatPositionSize(-0.5)).toBe('-0.5');
      expect(formatPositionSize(0.0024)).toBe('0.0024'); // Task example
    });

    it('should format normal numbers without trailing zeros', () => {
      expect(formatPositionSize(1.2345)).toBe('1.23');
      expect(formatPositionSize('100.9876')).toBe('100.99');
      expect(formatPositionSize(-50.123)).toBe('-50.12');
      expect(formatPositionSize(44)).toBe('44'); // Task example
      expect(formatPositionSize(0.23)).toBe('0.23'); // Task example
    });

    it('should handle edge case at boundaries', () => {
      expect(formatPositionSize(0.01)).toBe('0.01'); // exactly at threshold
      expect(formatPositionSize(1)).toBe('1'); // exactly at threshold
    });

    it('should handle invalid inputs', () => {
      expect(formatPositionSize('invalid')).toBe('0');
      expect(formatPositionSize(NaN)).toBe('0');
      expect(formatPositionSize('')).toBe('0');
    });

    it('should handle zero', () => {
      expect(formatPositionSize(0)).toBe('0');
      expect(formatPositionSize('0')).toBe('0');
    });

    it('should handle large numbers without trailing zeros', () => {
      expect(formatPositionSize(1000.567)).toBe('1000.57');
      expect(formatPositionSize('999999.123')).toBe('999999.12');
      expect(formatPositionSize(1000)).toBe('1000'); // No decimals for whole number
    });

    describe('with szDecimals parameter', () => {
      it('should format BTC with 5 decimals (szDecimals=5)', () => {
        expect(formatPositionSize(0.00009, 5)).toBe('0.00009');
        expect(formatPositionSize(1.234567, 5)).toBe('1.23457');
        expect(formatPositionSize(44.000001, 5)).toBe('44');
      });

      it('should format ETH with 4 decimals (szDecimals=4)', () => {
        expect(formatPositionSize(0.0024, 4)).toBe('0.0024');
        expect(formatPositionSize(10.56789, 4)).toBe('10.5679');
        expect(formatPositionSize(100, 4)).toBe('100');
      });

      it('should format DOGE with 1 decimal (szDecimals=1)', () => {
        expect(formatPositionSize(44.567, 1)).toBe('44.6');
        expect(formatPositionSize(1000.123, 1)).toBe('1000.1');
        expect(formatPositionSize(5.0, 1)).toBe('5');
      });

      it('should format with 0 decimals (szDecimals=0)', () => {
        expect(formatPositionSize(44.567, 0)).toBe('45');
        expect(formatPositionSize(1000.999, 0)).toBe('1001');
        expect(formatPositionSize(5.0, 0)).toBe('5');
      });

      it('should remove trailing zeros even with szDecimals', () => {
        expect(formatPositionSize(44.0, 5)).toBe('44');
        expect(formatPositionSize(0.001, 5)).toBe('0.001');
        expect(formatPositionSize(123.1, 4)).toBe('123.1');
      });

      it('should fallback to magnitude-based when szDecimals is undefined', () => {
        // These should match the existing non-szDecimals behavior
        expect(formatPositionSize(0.00009, undefined)).toBe('0.00009');
        expect(formatPositionSize(0.0024, undefined)).toBe('0.0024');
        expect(formatPositionSize(44, undefined)).toBe('44');
      });
    });
  });

  describe('formatLeverage', () => {
    it('should format leverage with x suffix', () => {
      expect(formatLeverage(2)).toBe('2.0x');
      expect(formatLeverage('5.5')).toBe('5.5x');
      expect(formatLeverage(10.25)).toBe('10.3x');
    });

    it('should handle edge cases', () => {
      expect(formatLeverage(0)).toBe('0.0x');
      expect(formatLeverage('1')).toBe('1.0x');
      expect(formatLeverage(100.999)).toBe('101.0x');
    });

    it('should handle invalid inputs', () => {
      expect(formatLeverage('invalid')).toBe('1x');
      expect(formatLeverage(NaN)).toBe('1x');
      expect(formatLeverage('')).toBe('1x');
    });

    it('should handle negative leverage', () => {
      expect(formatLeverage(-2.5)).toBe('-2.5x');
    });

    it('should round to 1 decimal place', () => {
      expect(formatLeverage(2.789)).toBe('2.8x');
      expect(formatLeverage(15.123)).toBe('15.1x');
    });

    it('should handle very large leverage values', () => {
      expect(formatLeverage(999.9)).toBe('999.9x');
      expect(formatLeverage('1000')).toBe('1000.0x');
    });
  });

  describe('parseCurrencyString', () => {
    it('should parse formatted currency strings', () => {
      expect(parseCurrencyString('$1,234.56')).toBe(1234.56);
      expect(parseCurrencyString('$1,000')).toBe(1000);
      expect(parseCurrencyString('$0.00')).toBe(0);
      expect(parseCurrencyString('$-123.45')).toBe(-123.45);
    });

    it('should handle strings without currency symbols', () => {
      expect(parseCurrencyString('1234.56')).toBe(1234.56);
      expect(parseCurrencyString('1,000')).toBe(1000);
    });

    it('should handle invalid inputs', () => {
      expect(parseCurrencyString('')).toBe(0);
      expect(parseCurrencyString('invalid')).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(parseCurrencyString(null as any)).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(parseCurrencyString(undefined as any)).toBe(0);
    });
  });

  describe('parsePercentageString', () => {
    it('should parse formatted percentage strings', () => {
      expect(parsePercentageString('+2.50%')).toBe(2.5);
      expect(parsePercentageString('-10.75%')).toBe(-10.75);
      expect(parsePercentageString('5%')).toBe(5);
      expect(parsePercentageString('0%')).toBe(0);
      expect(parsePercentageString('+0.00%')).toBe(0);
    });

    it('should handle strings without percentage symbols', () => {
      expect(parsePercentageString('2.5')).toBe(2.5);
      expect(parsePercentageString('-10.75')).toBe(-10.75);
      expect(parsePercentageString('+5')).toBe(5);
    });

    it('should handle spaces in the string', () => {
      expect(parsePercentageString('+ 2.50 %')).toBe(2.5);
      expect(parsePercentageString(' -10.75% ')).toBe(-10.75);
    });

    it('should handle invalid inputs', () => {
      expect(parsePercentageString('')).toBe(0);
      expect(parsePercentageString('abc')).toBe(0);
      expect(parsePercentageString('%')).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(parsePercentageString(undefined as any)).toBe(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(parsePercentageString(null as any)).toBe(0);
    });
  });

  describe('formatTransactionDate', () => {
    it('should format timestamp to readable date string with time', () => {
      const timestamp = 1642492800000; // January 18, 2022 at 12:00 AM UTC
      expect(formatTransactionDate(timestamp)).toMatch(
        /January 18, 2022 at \d{1,2}:\d{2} (AM|PM)/,
      );
    });

    it('should handle different months correctly', () => {
      // Use a timestamp that accounts for timezone - add 12 hours to ensure we're in the right day
      const julyTimestamp = 1658188800000 + 12 * 60 * 60 * 1000; // July 19, 2022 12:00:00 UTC
      expect(formatTransactionDate(julyTimestamp)).toMatch(
        /July 19, 2022 at \d{1,2}:\d{2} (AM|PM)/,
      );
    });

    it('should handle edge cases', () => {
      // Use a timestamp that accounts for timezone - add 12 hours to ensure we're in the right day
      const newYear = 1577836800000 + 12 * 60 * 60 * 1000; // January 1, 2020 12:00:00 UTC
      expect(formatTransactionDate(newYear)).toMatch(
        /January 1, 2020 at \d{1,2}:\d{2} (AM|PM)/,
      );
    });

    it('should handle zero timestamp', () => {
      // Use a timestamp that accounts for timezone - add 12 hours to ensure we're in the right day
      const zeroTimestamp = 0 + 12 * 60 * 60 * 1000; // January 1, 1970 12:00:00 UTC
      expect(formatTransactionDate(zeroTimestamp)).toMatch(
        /January 1, 1970 at \d{1,2}:\d{2} (AM|PM)/,
      );
    });
  });

  describe('Real-world price formatting examples', () => {
    // All price test cases consolidated into a single array for parameterized testing
    const allPrices = [
      // $100k+ range (> $10k: 0 decimals)
      {
        value: 126123.2345,
        priceRange: '$100k+',
        expected4SF: '$126,123',
        expectedDetailed: '$126,123.23',
        expectedMinimal: '$126,123.23',
        expectedUserInput: '$126,123.2345',
      },
      {
        value: 95123.45,
        priceRange: '$100k+',
        expected4SF: '$95,123',
        expectedDetailed: '$95,123.45',
        expectedMinimal: '$95,123.45',
        expectedUserInput: '$95,123.45',
      },
      {
        value: 100000,
        priceRange: '$100k+',
        expected4SF: '$100,000',
        expectedDetailed: '$100,000',
        expectedMinimal: '$100,000',
        expectedUserInput: '$100,000',
      },
      {
        value: 99999.99,
        priceRange: '$100k+',
        expected4SF: '$100,000',
        expectedDetailed: '$99,999.99',
        expectedMinimal: '$99,999.99',
        expectedUserInput: '$99,999.99',
      },
      // $1k-$10k range ($1k-$10k: 1 decimal max)
      {
        value: 3456.789,
        priceRange: '$1k-$10k',
        expected4SF: '$3,456.8',
        expectedDetailed: '$3,456.79',
        expectedMinimal: '$3,456.79',
        expectedUserInput: '$3,456.789',
      },
      {
        value: 2801.5,
        priceRange: '$1k-$10k',
        expected4SF: '$2,801.5',
        expectedDetailed: '$2,801.5',
        expectedMinimal: '$2,801.50', // Fiat-style: preserves 2 decimals
        expectedUserInput: '$2,801.5',
      },
      {
        value: 5000,
        priceRange: '$1k-$10k',
        expected4SF: '$5,000',
        expectedDetailed: '$5,000',
        expectedMinimal: '$5,000',
        expectedUserInput: '$5,000',
      },
      {
        value: 1234.56789,
        priceRange: '$1k-$10k',
        expected4SF: '$1,234.6',
        expectedDetailed: '$1,234.57',
        expectedMinimal: '$1,234.57',
        expectedUserInput: '$1,234.56789',
      },
      // $100-$1000 range ($100-$1k: 2 decimals max)
      {
        value: 234.567,
        priceRange: '$100-$1000',
        expected4SF: '$234.57',
        expectedDetailed: '$234.57',
        expectedMinimal: '$234.57',
        expectedUserInput: '$234.567',
      },
      {
        value: 150.123456,
        priceRange: '$100-$1000',
        expected4SF: '$150.12',
        expectedDetailed: '$150.12',
        expectedMinimal: '$150.12',
        expectedUserInput: '$150.123456',
      },
      {
        value: 999.99,
        priceRange: '$100-$1000',
        expected4SF: '$999.99',
        expectedDetailed: '$999.99',
        expectedMinimal: '$999.99',
        expectedUserInput: '$999.99',
      },
      // $10-$100 range ($10-$100: max 4 decimals, 5 sig figs)
      {
        value: 56.123,
        priceRange: '$10-$100',
        expected4SF: '$56.123',
        expectedDetailed: '$56.12',
        expectedMinimal: '$56.12',
        expectedUserInput: '$56.123',
      },
      {
        value: 45.6789,
        priceRange: '$10-$100',
        expected4SF: '$45.679',
        expectedDetailed: '$45.68',
        expectedMinimal: '$45.68',
        expectedUserInput: '$45.6789',
      },
      {
        value: 99.99,
        priceRange: '$10-$100',
        expected4SF: '$99.99',
        expectedDetailed: '$99.99',
        expectedMinimal: '$99.99',
        expectedUserInput: '$99.99',
      },
      {
        value: 10.5,
        priceRange: '$10-$100',
        expected4SF: '$10.5',
        expectedDetailed: '$10.5',
        expectedMinimal: '$10.50', // Fiat-style: preserves 2 decimals
        expectedUserInput: '$10.5',
      },
      // $1-$10 range (<= $10: 5 sig figs)
      {
        value: 2.87555,
        priceRange: '$1-$10',
        expected4SF: '$2.8756',
        expectedDetailed: '$2.876',
        expectedMinimal: '$2.88',
        expectedUserInput: '$2.87555',
      },
      {
        value: 5.1234,
        priceRange: '$1-$10',
        expected4SF: '$5.1234',
        expectedDetailed: '$5.123',
        expectedMinimal: '$5.12',
        expectedUserInput: '$5.1234',
      },
      {
        value: 1.234,
        priceRange: '$1-$10',
        expected4SF: '$1.234',
        expectedDetailed: '$1.234',
        expectedMinimal: '$1.23',
        expectedUserInput: '$1.234',
      },
      {
        value: 9.99,
        priceRange: '$1-$10',
        expected4SF: '$9.99',
        expectedDetailed: '$9.99',
        expectedMinimal: '$9.99',
        expectedUserInput: '$9.99',
      },
      {
        value: 1.0,
        priceRange: '$1-$10',
        expected4SF: '$1',
        expectedDetailed: '$1',
        expectedMinimal: '$1',
        expectedUserInput: '$1',
      },
      // $0.1-$1 range (<= $10: 5 sig figs)
      {
        value: 0.12345,
        priceRange: '$0.1-$1',
        expected4SF: '$0.12345',
        expectedDetailed: '$0.1235',
        expectedMinimal: '$0.12',
        expectedUserInput: '$0.12345',
      },
      {
        value: 0.5678,
        priceRange: '$0.1-$1',
        expected4SF: '$0.5678',
        expectedDetailed: '$0.5678',
        expectedMinimal: '$0.57',
        expectedUserInput: '$0.5678',
      },
      {
        value: 0.999,
        priceRange: '$0.1-$1',
        expected4SF: '$0.999',
        expectedDetailed: '$0.999',
        expectedMinimal: '$1',
        expectedUserInput: '$0.999',
      },
      {
        value: 0.1,
        priceRange: '$0.1-$1',
        expected4SF: '$0.1',
        expectedDetailed: '$0.1',
        expectedMinimal: '$0.10', // Fiat-style: preserves 2 decimals
        expectedUserInput: '$0.1',
      },
      // $0.00001-$0.0001 range (<$0.01: 4 sig figs)
      {
        value: 0.000012345,
        priceRange: '$0.00001-$0.0001',
        expected4SF: '$0.000012',
        expectedDetailed: '$0.00001234',
        expectedMinimal: '$0',
        expectedUserInput: '$0.000012345',
      },
      {
        value: 0.000098765,
        priceRange: '$0.00001-$0.0001',
        expected4SF: '$0.000099',
        expectedDetailed: '$0.00009876',
        expectedMinimal: '$0',
        expectedUserInput: '$0.000098765',
      },
      {
        value: 0.00005,
        priceRange: '$0.00001-$0.0001',
        expected4SF: '$0.00005',
        expectedDetailed: '$0.00005',
        expectedMinimal: '$0',
        expectedUserInput: '$0.00005',
      },
      // <$0.00001 range (<$0.01: 4 sig figs)
      {
        value: 0.00000123,
        priceRange: '<$0.00001',
        expected4SF: '$0.000001',
        expectedDetailed: '$0.00000123',
        expectedMinimal: '$0',
        expectedUserInput: '$0.00000123',
      },
      {
        value: 0.00004321,
        priceRange: '<$0.00001',
        expected4SF: '$0.000043',
        expectedDetailed: '$0.00004321',
        expectedMinimal: '$0',
        expectedUserInput: '$0.00004321',
      },
      // Edge cases
      {
        value: 0,
        priceRange: 'Edge cases',
        expected4SF: '$0',
        expectedDetailed: '$0',
        expectedMinimal: '$0',
        expectedUserInput: '$0',
      },
      {
        value: 1,
        priceRange: 'Edge cases',
        expected4SF: '$1',
        expectedDetailed: '$1',
        expectedMinimal: '$1',
        expectedUserInput: '$1',
      },
      {
        value: 1000,
        priceRange: 'Edge cases',
        expected4SF: '$1,000',
        expectedDetailed: '$1,000',
        expectedMinimal: '$1,000',
        expectedUserInput: '$1,000',
      },
      {
        value: 1000000,
        priceRange: 'Edge cases',
        expected4SF: '$1,000,000',
        expectedDetailed: '$1,000,000',
        expectedMinimal: '$1,000,000',
        expectedUserInput: '$1,000,000',
      },
    ];

    // Test all prices with PRICE_RANGES_UNIVERSAL and PRICE_RANGES_MINIMAL_VIEW
    it.each(allPrices)(
      'formats $value ($priceRange) correctly with all configs',
      ({ value, expected4SF, expectedMinimal }) => {
        // PRICE_RANGES_UNIVERSAL (comprehensive formatting)
        expect(formatPerpsFiat(value, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          expected4SF,
        );

        // Minimal view (balances/margins - 2 decimals)
        expect(
          formatPerpsFiat(value, { ranges: PRICE_RANGES_MINIMAL_VIEW }),
        ).toBe(expectedMinimal);
      },
    );

    describe('High precision formatting with PRICE_RANGES_UNIVERSAL', () => {
      it('should preserve appropriate precision based on magnitude', () => {
        // PRICE_RANGES_UNIVERSAL preserves up to 6 decimals dynamically
        expect(
          formatPerpsFiat(2.87555, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$2.8756');
        expect(
          formatPerpsFiat(0.00012345, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$0.000123');
        expect(
          formatPerpsFiat(121432.0132, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$121,432');
      });

      it('should still strip trailing zeros with PRICE_RANGES_UNIVERSAL', () => {
        expect(formatPerpsFiat(2.87, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          '$2.87',
        );
        expect(formatPerpsFiat(100.0, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          '$100',
        );
        expect(formatPerpsFiat(0.123, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          '$0.123',
        );
      });
    });

    describe('stripTrailingZeros interaction with different configs', () => {
      it('should respect stripTrailingZeros: false with MINIMAL_VIEW', () => {
        expect(
          formatPerpsFiat(1250, {
            ranges: PRICE_RANGES_MINIMAL_VIEW,
            stripTrailingZeros: false,
          }),
        ).toBe('$1,250.00');
      });

      it('should strip zeros by default even with minimumDecimals', () => {
        expect(formatPerpsFiat(1250, { minimumDecimals: 2 })).toBe('$1,250');
        expect(formatPerpsFiat(100.0, { minimumDecimals: 2 })).toBe('$100');
      });

      it('should preserve decimals when stripTrailingZeros: false', () => {
        expect(
          formatPerpsFiat(1250.5, {
            minimumDecimals: 2,
            stripTrailingZeros: false,
          }),
        ).toBe('$1,250.50');
      });
    });

    describe('PRICE_RANGES_UNIVERSAL (comprehensive formatting)', () => {
      it('should format high-value BTC prices without decimals (> $10k)', () => {
        // BTC at $126k - no decimals for cleaner display
        expect(
          formatPerpsFiat(126123.2345, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$126,123');
        expect(
          formatPerpsFiat(95123.45, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$95,123');
        expect(
          formatPerpsFiat(100000, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$100,000');

        // Edge case: just at $10k threshold
        expect(formatPerpsFiat(10000, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          '$10,000',
        );
        expect(
          formatPerpsFiat(10000.99, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$10,001');
      });

      it('should format mid-range prices with appropriate decimals', () => {
        // $1k-$10k: 1 decimal max, 5 sig figs
        expect(
          formatPerpsFiat(3456.789, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$3,456.8');
        expect(
          formatPerpsFiat(2801.5, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$2,801.5');

        // $100-$1000: 2 decimals max
        expect(
          formatPerpsFiat(234.567, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$234.57');
        expect(
          formatPerpsFiat(999.99, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$999.99');

        // $10-$100: max 4 decimals, 5 sig figs
        expect(
          formatPerpsFiat(56.123, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$56.123');
        expect(
          formatPerpsFiat(45.6789, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$45.679');

        // <= $10: 5 sig figs
        expect(formatPerpsFiat(2.876, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          '$2.876',
        );
      });

      it('should format small prices with high precision (< $1)', () => {
        // Small values: <= $10: 5 sig figs
        expect(
          formatPerpsFiat(0.12345, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$0.12345');
        expect(
          formatPerpsFiat(0.5678, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$0.5678');

        // Very small: <$0.01: 4 sig figs, max 6 decimals
        expect(
          formatPerpsFiat(0.000012345, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$0.000012');
        expect(
          formatPerpsFiat(0.00000123, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('$0.000001');
      });

      it('should handle negative values (short positions)', () => {
        expect(
          formatPerpsFiat(-126123.2345, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('-$126,123');
        expect(
          formatPerpsFiat(-234.567, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('-$234.57');
        expect(
          formatPerpsFiat(-0.12345, { ranges: PRICE_RANGES_UNIVERSAL }),
        ).toBe('-$0.12345');
      });

      it('should handle edge cases', () => {
        expect(formatPerpsFiat(0, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          '$0',
        );
        expect(formatPerpsFiat(1, { ranges: PRICE_RANGES_UNIVERSAL })).toBe(
          '$1',
        );
      });
    });
  });

  describe('formatDateSection', () => {
    let originalDate: typeof Date;
    let mockDateNow: jest.SpyInstance;
    let mockDateConstructor: jest.SpyInstance;

    beforeEach(() => {
      // Store the original Date constructor
      originalDate = global.Date;
    });

    afterEach(() => {
      // Restore the original Date constructor
      global.Date = originalDate;
      if (mockDateNow) {
        mockDateNow.mockRestore();
      }
      if (mockDateConstructor) {
        mockDateConstructor.mockRestore();
      }
    });

    it('should return "Today" for current date', () => {
      // Mock Date.now to return a specific timestamp
      const mockNow = new Date('2022-01-18T12:00:00Z').getTime();
      mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Mock the Date constructor to return consistent dates
      mockDateConstructor = jest
        .spyOn(global, 'Date')
        .mockImplementation((input?: string | number | Date) => {
          if (input === undefined) {
            return new originalDate(mockNow);
          }
          return new originalDate(input);
        });

      const todayTimestamp = mockNow;
      expect(formatDateSection(todayTimestamp)).toBe('Today');
    });

    it('should return "Yesterday" for previous day', () => {
      // Mock Date.now to return a specific timestamp
      const mockNow = new Date('2022-01-18T12:00:00Z').getTime();
      mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Mock the Date constructor to return consistent dates
      mockDateConstructor = jest
        .spyOn(global, 'Date')
        .mockImplementation((input?: string | number | Date) => {
          if (input === undefined) {
            return new originalDate(mockNow);
          }
          return new originalDate(input);
        });

      const yesterday = new Date('2022-01-17T12:00:00Z').getTime();
      expect(formatDateSection(yesterday)).toBe('Yesterday');
    });

    it('should return formatted date for older dates', () => {
      // Mock Date.now to return a specific timestamp
      const mockNow = new Date('2022-01-18T12:00:00Z').getTime();
      mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Mock the Date constructor to return consistent dates
      mockDateConstructor = jest
        .spyOn(global, 'Date')
        .mockImplementation((input?: string | number | Date) => {
          if (input === undefined) {
            return new originalDate(mockNow);
          }
          return new originalDate(input);
        });

      const olderDate = new Date('2022-01-15T12:00:00Z').getTime();
      expect(formatDateSection(olderDate)).toBe('Jan 15');
    });

    it('should handle different months', () => {
      // Mock Date.now to return a specific timestamp
      const mockNow = new Date('2022-01-18T12:00:00Z').getTime();
      mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      // Mock the Date constructor to return consistent dates
      mockDateConstructor = jest
        .spyOn(global, 'Date')
        .mockImplementation((input?: string | number | Date) => {
          if (input === undefined) {
            return new originalDate(mockNow);
          }
          return new originalDate(input);
        });

      const julyDate = new Date('2021-07-15T12:00:00Z').getTime();
      expect(formatDateSection(julyDate)).toBe('Jul 15');
    });
  });
});
