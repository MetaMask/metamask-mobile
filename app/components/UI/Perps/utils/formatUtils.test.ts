/**
 * Unit tests for formatting utilities
 */

import {
  formatPerpsFiat,
  formatPrice,
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

  describe('formatPerpsFiat', () => {
    it('should format balance with default 2 decimal places', () => {
      expect(formatPerpsFiat(1234.56)).toBe('$1,234.56');
      expect(formatPerpsFiat('5000')).toBe('$5,000.00');
      expect(formatPerpsFiat(100)).toBe('$100.00');
    });

    it('should handle large numbers', () => {
      expect(formatPerpsFiat(1000000)).toBe('$1,000,000.00');
      expect(formatPerpsFiat(999999.99)).toBe('$999,999.99');
      expect(formatPerpsFiat('123456.789')).toBe('$123,456.79');
    });

    it('should handle small decimal values', () => {
      expect(formatPerpsFiat(0.1)).toBe('$0.10'); // Currency standard: at least 2 decimals
    });

    it('should return $0.00 for NaN values', () => {
      expect(formatPerpsFiat('invalid')).toBe('$0.00');
      expect(formatPerpsFiat('')).toBe('$0.00');
      expect(formatPerpsFiat('abc')).toBe('$0.00');
    });
  });

  describe('formatPrice', () => {
    it('should format prices >= 1000 with 2 decimal places', () => {
      expect(formatPrice(1234.56)).toBe('$1,234.56');
      expect(formatPrice('5000')).toBe('$5,000.00');
      expect(formatPrice(999999.99)).toBe('$999,999.99');
    });

    it('should format prices < 1000 with up to 4 decimal places', () => {
      expect(formatPrice(123.4567)).toBe('$123.4567');
      expect(formatPrice('99.99')).toBe('$99.99');
      expect(formatPrice(0.1234)).toBe('$0.1234');
      expect(formatPrice(0.01)).toBe('$0.01');
    });

    it('should handle edge cases', () => {
      expect(formatPrice(0)).toBe('$0.00');
      expect(formatPrice('0')).toBe('$0.00');
      expect(formatPrice(-100)).toBe('-$100.00');
    });

    it('should handle invalid inputs', () => {
      expect(formatPrice('invalid')).toBe('$0.00');
      expect(formatPrice(NaN)).toBe('$0.00');
      expect(formatPrice('')).toBe('$0.00');
    });

    it('should handle very large numbers', () => {
      expect(formatPrice(1000000)).toBe('$1,000,000.00');
      expect(formatPrice('999999999')).toBe('$999,999,999.00');
    });

    it('should handle very small numbers', () => {
      expect(formatPrice(0.0001)).toBe('$0.0001');
      expect(formatPrice('0.00001')).toBe('$0.00');
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
    it('should format very small numbers with 6 decimal places', () => {
      expect(formatPositionSize(0.001)).toBe('0.001000');
      expect(formatPositionSize('0.0001')).toBe('0.000100');
      expect(formatPositionSize(-0.005)).toBe('-0.005000');
    });

    it('should format small numbers with 4 decimal places', () => {
      expect(formatPositionSize(0.1234)).toBe('0.1234');
      expect(formatPositionSize('0.9999')).toBe('0.9999');
      expect(formatPositionSize(-0.5)).toBe('-0.5000');
    });

    it('should format normal numbers with 2 decimal places', () => {
      expect(formatPositionSize(1.2345)).toBe('1.23');
      expect(formatPositionSize('100.9876')).toBe('100.99');
      expect(formatPositionSize(-50.123)).toBe('-50.12');
    });

    it('should handle edge case at boundaries', () => {
      expect(formatPositionSize(0.01)).toBe('0.0100'); // exactly at threshold
      expect(formatPositionSize(1)).toBe('1.00'); // exactly at threshold
    });

    it('should handle invalid inputs', () => {
      expect(formatPositionSize('invalid')).toBe('0');
      expect(formatPositionSize(NaN)).toBe('0');
      expect(formatPositionSize('')).toBe('0');
    });

    it('should handle zero', () => {
      expect(formatPositionSize(0)).toBe('0.000000');
      expect(formatPositionSize('0')).toBe('0.000000');
    });

    it('should handle large numbers', () => {
      expect(formatPositionSize(1000.567)).toBe('1000.57');
      expect(formatPositionSize('999999.123')).toBe('999999.12');
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
      expect(formatDateSection(olderDate)).toBe('Jan, 15');
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
      expect(formatDateSection(julyDate)).toBe('Jul, 15');
    });
  });
});
