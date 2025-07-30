import { calculateFundingCountdown, calculate24hHighLow } from './marketUtils';
import type { CandleData } from '../types';

describe('marketUtils', () => {
  describe('calculateFundingCountdown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should calculate correct countdown when current time is before 8:00 UTC', () => {
      // Set time to 2024-01-01 07:30:45 UTC
      const mockDate = new Date('2024-01-01T07:30:45.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:29:15'); // 29 minutes 15 seconds until 8:00
    });

    it('should calculate correct countdown when current time is before 16:00 UTC', () => {
      // Set time to 2024-01-01 15:45:30 UTC
      const mockDate = new Date('2024-01-01T15:45:30.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:14:30'); // 14 minutes 30 seconds until 16:00
    });

    it('should calculate correct countdown when current time is after 16:00 UTC', () => {
      // Set time to 2024-01-01 23:30:00 UTC
      const mockDate = new Date('2024-01-01T23:30:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:30:00'); // 30 minutes until 00:00
    });

    it('should handle exact funding time correctly', () => {
      // Set time to exactly 8:00:00 UTC
      const mockDate = new Date('2024-01-01T08:00:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('08:00:00'); // 8 hours until 16:00
    });

    it('should handle midnight correctly', () => {
      // Set time to exactly 00:00:00 UTC
      const mockDate = new Date('2024-01-01T00:00:00.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('08:00:00'); // 8 hours until 08:00
    });

    it('should format single digit values with leading zeros', () => {
      // Set time to 2024-01-01 07:58:55 UTC
      const mockDate = new Date('2024-01-01T07:58:55.000Z');
      jest.setSystemTime(mockDate);

      const result = calculateFundingCountdown();
      expect(result).toBe('00:01:05'); // 1 minute 5 seconds until 8:00
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
      interval: '1h',
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
        interval: '1h',
        candles: [],
      };
      const result = calculate24hHighLow(emptyData);
      expect(result).toEqual({ high: 0, low: 0 });
    });

    it('should use all candles if none are within 24h', () => {
      const oldCandleData: CandleData = {
        coin: 'BTC',
        interval: '1h',
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
        interval: '1h',
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
        interval: '1h',
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
