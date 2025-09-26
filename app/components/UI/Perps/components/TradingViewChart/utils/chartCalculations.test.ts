import { CandlePeriod, TimeDuration } from '../../../constants/chartConfig';
import {
  getDurationInMinutes,
  getPeriodInMinutes,
  getCandleCount,
  createIntervalUpdateMessage,
} from './chartCalculations';

describe('chartCalculations', () => {
  describe('getDurationInMinutes', () => {
    it('converts duration enums to correct minutes', () => {
      expect(getDurationInMinutes(TimeDuration.ONE_HOUR)).toBe(60);
      expect(getDurationInMinutes(TimeDuration.ONE_DAY)).toBe(1440);
      expect(getDurationInMinutes(TimeDuration.ONE_WEEK)).toBe(10080);
      expect(getDurationInMinutes(TimeDuration.ONE_MONTH)).toBe(43200);
      expect(getDurationInMinutes(TimeDuration.YEAR_TO_DATE)).toBe(525600);
      expect(getDurationInMinutes(TimeDuration.MAX)).toBe(1051200); // 2 years
    });

    it('returns default for unknown duration', () => {
      expect(getDurationInMinutes('UNKNOWN')).toBe(1440); // 1 day default
    });
  });

  describe('getPeriodInMinutes', () => {
    it('converts period enums to correct minutes', () => {
      expect(getPeriodInMinutes(CandlePeriod.ONE_MINUTE)).toBe(1);
      expect(getPeriodInMinutes(CandlePeriod.THREE_MINUTES)).toBe(3);
      expect(getPeriodInMinutes(CandlePeriod.FIVE_MINUTES)).toBe(5);
      expect(getPeriodInMinutes(CandlePeriod.FIFTEEN_MINUTES)).toBe(15);
      expect(getPeriodInMinutes(CandlePeriod.THIRTY_MINUTES)).toBe(30);
      expect(getPeriodInMinutes(CandlePeriod.ONE_HOUR)).toBe(60);
      expect(getPeriodInMinutes(CandlePeriod.TWO_HOURS)).toBe(120);
      expect(getPeriodInMinutes(CandlePeriod.FOUR_HOURS)).toBe(240);
      expect(getPeriodInMinutes(CandlePeriod.EIGHT_HOURS)).toBe(480);
      expect(getPeriodInMinutes(CandlePeriod.TWELVE_HOURS)).toBe(720);
      expect(getPeriodInMinutes(CandlePeriod.ONE_DAY)).toBe(1440);
      expect(getPeriodInMinutes(CandlePeriod.THREE_DAYS)).toBe(4320);
      expect(getPeriodInMinutes(CandlePeriod.ONE_WEEK)).toBe(10080);
      expect(getPeriodInMinutes(CandlePeriod.ONE_MONTH)).toBe(43200);
    });

    it('returns default for unknown period', () => {
      expect(getPeriodInMinutes('UNKNOWN')).toBe(60); // 1 hour default
    });
  });

  describe('getCandleCount', () => {
    it('calculates correct candle count for various combinations', () => {
      // Basic calculations
      expect(
        getCandleCount(TimeDuration.ONE_HOUR, CandlePeriod.ONE_MINUTE),
      ).toBe(60);
      expect(getCandleCount(TimeDuration.ONE_DAY, CandlePeriod.ONE_HOUR)).toBe(
        24,
      );
      expect(getCandleCount(TimeDuration.ONE_WEEK, CandlePeriod.ONE_HOUR)).toBe(
        168,
      );
      expect(
        getCandleCount(TimeDuration.ONE_WEEK, CandlePeriod.TWO_HOURS),
      ).toBe(84);
    });

    it('enforces minimum candle count of 10', () => {
      // Very long period relative to duration should result in minimum 10
      expect(getCandleCount(TimeDuration.ONE_HOUR, CandlePeriod.ONE_DAY)).toBe(
        10,
      );
      expect(getCandleCount(TimeDuration.ONE_DAY, CandlePeriod.ONE_WEEK)).toBe(
        10,
      );
    });

    it('enforces maximum candle count of 500', () => {
      // Very short period relative to duration should cap at 500
      expect(
        getCandleCount(TimeDuration.ONE_DAY, CandlePeriod.ONE_MINUTE),
      ).toBe(500);
      expect(getCandleCount(TimeDuration.MAX, CandlePeriod.ONE_MINUTE)).toBe(
        500,
      );
      expect(
        getCandleCount(TimeDuration.YEAR_TO_DATE, CandlePeriod.ONE_MINUTE),
      ).toBe(500);
    });

    it('handles unknown duration and period', () => {
      // Unknown duration defaults to 1 day, unknown period defaults to 1 hour
      expect(getCandleCount('UNKNOWN', 'UNKNOWN')).toBe(24);
      expect(getCandleCount(TimeDuration.ONE_DAY, 'UNKNOWN')).toBe(24);
      expect(getCandleCount('UNKNOWN', CandlePeriod.ONE_HOUR)).toBe(24);
    });
  });

  describe('createIntervalUpdateMessage', () => {
    beforeAll(() => {
      // Mock Date to ensure consistent timestamps in tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('creates correct interval update message', () => {
      const message = createIntervalUpdateMessage(
        TimeDuration.ONE_DAY,
        CandlePeriod.ONE_HOUR,
      );

      expect(message).toEqual({
        type: 'UPDATE_INTERVAL',
        duration: TimeDuration.ONE_DAY,
        candlePeriod: CandlePeriod.ONE_HOUR,
        candleCount: 24,
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('handles string parameters', () => {
      const message = createIntervalUpdateMessage('1d', '1h');

      expect(message).toEqual({
        type: 'UPDATE_INTERVAL',
        duration: '1d',
        candlePeriod: '1h',
        candleCount: 24, // Unknown strings default to 1 day / 1 hour = 24
        timestamp: '2024-01-01T00:00:00.000Z',
      });
    });

    it('applies candle count limits in message', () => {
      // Test maximum limit
      const maxMessage = createIntervalUpdateMessage(
        TimeDuration.MAX,
        CandlePeriod.ONE_MINUTE,
      );
      expect(maxMessage.candleCount).toBe(500);

      // Test minimum limit
      const minMessage = createIntervalUpdateMessage(
        TimeDuration.ONE_HOUR,
        CandlePeriod.ONE_DAY,
      );
      expect(minMessage.candleCount).toBe(10);
    });
  });
});
