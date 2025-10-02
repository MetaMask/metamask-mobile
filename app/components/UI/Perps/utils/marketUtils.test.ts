import { calculateFundingCountdown, calculate24hHighLow } from './marketUtils';
import type { CandleData } from '../types';
import { CandlePeriod } from '../constants/chartConfig';

describe('marketUtils', () => {
  describe('calculateFundingCountdown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate correct countdown when current time is mid-hour', () => {
      // Set time to 2024-01-01 07:30:45 UTC
      const mockDate = new Date('2024-01-01T07:30:45.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:29:15'); // 29 minutes 15 seconds until next hour (08:00)
    });

    it('should calculate correct countdown in any hour', () => {
      // Set time to 2024-01-01 15:45:30 UTC
      const mockDate = new Date('2024-01-01T15:45:30.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:14:30'); // 14 minutes 30 seconds until next hour (16:00)
    });

    it('should calculate correct countdown at any time of day', () => {
      // Set time to 2024-01-01 23:30:00 UTC
      const mockDate = new Date('2024-01-01T23:30:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:30:00'); // 30 minutes until next hour (00:00)
    });

    it('should handle exact hour correctly', () => {
      // Set time to exactly 8:00:00 UTC (exact funding time)
      const mockDate = new Date('2024-01-01T08:00:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('01:00:00'); // 1 hour until next funding (9:00)
    });

    it('should handle midnight correctly', () => {
      // Set time to exactly 00:00:00 UTC
      const mockDate = new Date('2024-01-01T00:00:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('01:00:00'); // 1 hour until next funding (01:00)
    });

    it('should format single digit values with leading zeros', () => {
      // Set time to 2024-01-01 07:58:55 UTC
      const mockDate = new Date('2024-01-01T07:58:55.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:01:05'); // 1 minute 5 seconds until next hour (8:00)
    });

    it('should use specific next funding time when provided and within reasonable range', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Next funding time is in 30 minutes (reasonable for hourly funding)
      const nextFundingTime = mockDate.getTime() + 30 * 60 * 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      expect(result).toBe('00:30:00');
    });

    it('should use specific next funding time with seconds when within reasonable range', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Next funding time is in 45 minutes 30 seconds (reasonable for hourly funding)
      const nextFundingTime = mockDate.getTime() + (45 * 60 + 30) * 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      expect(result).toBe('00:45:30');
    });

    it('should handle expired specific funding time', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Next funding time is in the past
      const nextFundingTime = mockDate.getTime() - 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      // Falls back to default calculation when specific time is expired
      expect(result).toBe('01:00:00'); // 1 hour until next hour (13:00)
    });

    it('should handle edge case at 59 seconds', () => {
      // Set time to 07:59:01 UTC (59 seconds before funding)
      const mockDate = new Date('2024-01-01T07:59:01.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:00:59');
    });

    it('should handle edge case with 60 seconds exactly', () => {
      // Set time to 07:59:00 UTC (60 seconds before funding)
      const mockDate = new Date('2024-01-01T07:59:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:01:00');
    });

    it('should handle different UTC hours correctly', () => {
      // Test different hours - all should show 1 hour until next funding
      const testCases = [
        { hour: 0, expected: '01:00:00' }, // 00:00 -> 01:00
        { hour: 4, expected: '01:00:00' }, // 04:00 -> 05:00
        { hour: 8, expected: '01:00:00' }, // 08:00 -> 09:00
        { hour: 12, expected: '01:00:00' }, // 12:00 -> 13:00
        { hour: 16, expected: '01:00:00' }, // 16:00 -> 17:00
        { hour: 20, expected: '01:00:00' }, // 20:00 -> 21:00
      ];

      testCases.forEach(({ hour, expected }) => {
        const mockDate = new Date(
          `2024-01-01T${hour.toString().padStart(2, '0')}:00:00.000Z`,
        );
        jest.setSystemTime(mockDate);

        const result = calculateFundingCountdown();
        expect(result).toBe(expected);
      });
    });

    it('should handle time with custom funding interval', () => {
      const mockDate = new Date('2024-01-01T10:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Custom 4 hour funding interval (not used in default calculation)
      const result = calculateFundingCountdown({ fundingIntervalHours: 4 });
      // Still uses default calculation when no nextFundingTime provided
      expect(result).toBe('01:00:00'); // 1 hour until next hour (11:00)
    });

    it('should never exceed 59:59 for HyperLiquid 1-hour intervals', () => {
      // Test multiple random times throughout the day to ensure countdown never exceeds 59:59
      const testTimes = [
        '2024-01-01T00:30:15.000Z', // Mid first hour
        '2024-01-01T05:45:30.000Z', // Mid morning
        '2024-01-01T12:15:45.000Z', // Mid day
        '2024-01-01T18:59:59.000Z', // Last second before hour
        '2024-01-01T23:00:01.000Z', // Just after hour
      ];

      testTimes.forEach((timeString) => {
        const mockDate = new Date(timeString);
        jest.setSystemTime(mockDate);

        const result = calculateFundingCountdown();

        // Parse result and ensure it never exceeds 59:59
        const [hours, minutes, seconds] = result.split(':').map(Number);
        expect(hours).toBeLessThanOrEqual(1); // Should never be more than 1 hour
        expect(minutes).toBeLessThanOrEqual(59);
        expect(seconds).toBeLessThanOrEqual(59);

        // For fallback logic, hours should be 0 or 1 at most
        expect(hours).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle market-specific funding time that exceeds 1 hour by using fallback', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Market-specific funding time is 2.5 hours away (too long for HyperLiquid hourly funding)
      const nextFundingTime = mockDate.getTime() + 2.5 * 60 * 60 * 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      expect(result).toBe('01:00:00'); // Should use fallback logic for hourly funding
    });

    it('should use market-specific time when within reasonable range for hourly funding', () => {
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      jest.setSystemTime(mockDate);

      // Market-specific funding time is 45 minutes away (reasonable for hourly funding)
      const nextFundingTime = mockDate.getTime() + 45 * 60 * 1000;

      const result = calculateFundingCountdown({ nextFundingTime });
      expect(result).toBe('00:45:00'); // Should use market-specific time
    });
  });

  describe('calculate24hHighLow', () => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const twelveHoursAgo = now - 12 * 60 * 60 * 1000;
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

    const mockCandleData: CandleData = {
      coin: 'BTC',
      interval: CandlePeriod.ONE_HOUR,
      candles: [
        {
          time: fortyEightHoursAgo,
          open: '100',
          high: '150',
          low: '90',
          close: '120',
          volume: '1000',
        },
        {
          time: twentyFourHoursAgo + 1000, // Just within 24h
          open: '120',
          high: '140',
          low: '110',
          close: '130',
          volume: '1500',
        },
        {
          time: twelveHoursAgo,
          open: '130',
          high: '160',
          low: '125',
          close: '155',
          volume: '2000',
        },
        {
          time: oneHourAgo,
          open: '155',
          high: '170',
          low: '150',
          close: '165',
          volume: '2500',
        },
      ],
    };

    it('should return correct high and low for 24h period', () => {
      const result = calculate24hHighLow(mockCandleData);
      expect(result).toEqual({
        high: 170, // Highest from last 3 candles (within 24h)
        low: 110, // Lowest from last 3 candles (within 24h)
      });
    });

    it('should handle null candleData', () => {
      const result = calculate24hHighLow(null);
      expect(result).toEqual({ high: 0, low: 0 });
    });

    it('should handle empty candles array', () => {
      const emptyData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [],
      };
      const result = calculate24hHighLow(emptyData);
      expect(result).toEqual({ high: 0, low: 0 });
    });

    it('should use all candles if none are within 24h', () => {
      const oldCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: fortyEightHoursAgo,
            open: '100',
            high: '200',
            low: '50',
            close: '120',
            volume: '1000',
          },
        ],
      };
      const result = calculate24hHighLow(oldCandleData);
      expect(result).toEqual({ high: 200, low: 50 });
    });

    it('should handle candles with string values', () => {
      const stringCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: oneHourAgo,
            open: '100.50',
            high: '150.75',
            low: '90.25',
            close: '120.60',
            volume: '1000',
          },
        ],
      };
      const result = calculate24hHighLow(stringCandleData);
      expect(result).toEqual({ high: 150.75, low: 90.25 });
    });

    it('should handle single candle within 24h', () => {
      const singleCandleData: CandleData = {
        coin: 'BTC',
        interval: CandlePeriod.ONE_HOUR,
        candles: [
          {
            time: oneHourAgo,
            open: '100',
            high: '120',
            low: '80',
            close: '110',
            volume: '500',
          },
        ],
      };
      const result = calculate24hHighLow(singleCandleData);
      expect(result).toEqual({ high: 120, low: 80 });
    });
  });
});
