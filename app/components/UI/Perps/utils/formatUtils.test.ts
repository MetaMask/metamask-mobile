/**
 * Unit tests for formatting utilities
 */

import {
  formatPerpsFiat,
  formatPrice,
  formatPnl,
  formatPercentage,
  formatLargeNumber,
  formatPositionSize,
  formatLeverage,
  parseCurrencyString,
  parsePercentageString,
  formatTransactionDate,
  formatDateSection,
} from './formatUtils';

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
    it('should format billions with B suffix', () => {
      expect(formatLargeNumber(1000000000)).toBe('1.0B');
      expect(formatLargeNumber('2500000000')).toBe('2.5B');
      expect(formatLargeNumber(12300000000)).toBe('12.3B');
    });

    it('should format millions with M suffix', () => {
      expect(formatLargeNumber(1000000)).toBe('1.0M');
      expect(formatLargeNumber('2500000')).toBe('2.5M');
      expect(formatLargeNumber(123456789)).toBe('123.5M');
    });

    it('should format thousands with K suffix', () => {
      expect(formatLargeNumber(1000)).toBe('1.0K');
      expect(formatLargeNumber('2500')).toBe('2.5K');
      expect(formatLargeNumber(123456)).toBe('123.5K');
    });

    it('should format numbers < 1000 with 2 decimal places', () => {
      expect(formatLargeNumber(999)).toBe('999.00');
      expect(formatLargeNumber('123.45')).toBe('123.45');
      expect(formatLargeNumber(0)).toBe('0.00');
    });

    it('should handle invalid inputs', () => {
      expect(formatLargeNumber('invalid')).toBe('0');
      expect(formatLargeNumber(NaN)).toBe('0');
      expect(formatLargeNumber('')).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatLargeNumber(-1000000)).toBe('-1000000.00');
      expect(formatLargeNumber(-2500)).toBe('-2500.00');
      expect(formatLargeNumber(-999)).toBe('-999.00');
    });

    it('should handle edge cases at boundaries', () => {
      expect(formatLargeNumber(999999999)).toBe('1000.0M');
      expect(formatLargeNumber(999999)).toBe('1000.0K');
      expect(formatLargeNumber(999.99)).toBe('999.99');
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
    it('should format timestamp to readable date string', () => {
      const timestamp = 1642492800000; // January 18, 2022
      expect(formatTransactionDate(timestamp)).toBe('January 18, 2022');
    });

    it('should handle different months correctly', () => {
      // Use a timestamp that accounts for timezone - add 12 hours to ensure we're in the right day
      const julyTimestamp = 1658188800000 + 12 * 60 * 60 * 1000; // July 19, 2022 12:00:00 UTC
      expect(formatTransactionDate(julyTimestamp)).toBe('July 19, 2022');
    });

    it('should handle edge cases', () => {
      // Use a timestamp that accounts for timezone - add 12 hours to ensure we're in the right day
      const newYear = 1577836800000 + 12 * 60 * 60 * 1000; // January 1, 2020 12:00:00 UTC
      expect(formatTransactionDate(newYear)).toBe('January 1, 2020');
    });

    it('should handle zero timestamp', () => {
      // Use a timestamp that accounts for timezone - add 12 hours to ensure we're in the right day
      const zeroTimestamp = 0 + 12 * 60 * 60 * 1000; // January 1, 1970 12:00:00 UTC
      expect(formatTransactionDate(zeroTimestamp)).toBe('January 1, 1970');
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
