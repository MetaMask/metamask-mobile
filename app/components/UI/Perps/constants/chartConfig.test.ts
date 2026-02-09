import {
  CandlePeriod,
  TimeDuration,
  getCandlePeriodsForDuration,
  getDefaultCandlePeriodForDuration,
  calculateCandleCount,
  getCandlestickColors,
} from './chartConfig';

describe('chartConfig', () => {
  describe('getCandlePeriodsForDuration', () => {
    it('returns correct periods for one hour duration', () => {
      // Act
      const periods = getCandlePeriodsForDuration(TimeDuration.OneHour);

      // Assert
      expect(periods).toHaveLength(4);
      expect(periods[0]?.value).toBe(CandlePeriod.OneMinute);
      expect(periods[1]?.value).toBe(CandlePeriod.ThreeMinutes);
    });

    it('returns empty array for unknown duration', () => {
      // Act
      const periods = getCandlePeriodsForDuration('unknown');

      // Assert
      expect(periods).toEqual([]);
    });
  });

  describe('getDefaultCandlePeriodForDuration', () => {
    it('returns correct default for one day duration', () => {
      // Act
      const defaultPeriod = getDefaultCandlePeriodForDuration(
        TimeDuration.OneDay,
      );

      // Assert
      expect(defaultPeriod).toBe(CandlePeriod.OneHour);
    });

    it('returns fallback for unknown duration', () => {
      // Act
      const defaultPeriod = getDefaultCandlePeriodForDuration('unknown');

      // Assert
      expect(defaultPeriod).toBe(CandlePeriod.OneHour);
    });
  });

  describe('calculateCandleCount', () => {
    it('calculates correct count for one hour with one minute periods', () => {
      // Act
      const count = calculateCandleCount(
        TimeDuration.OneHour,
        CandlePeriod.OneMinute,
      );

      // Assert
      expect(count).toBe(60); // 60 minutes / 1 minute per candle
    });

    it('calculates correct count for one day with one hour periods', () => {
      // Act
      const count = calculateCandleCount(
        TimeDuration.OneDay,
        CandlePeriod.OneHour,
      );

      // Assert
      expect(count).toBe(24); // 24 hours / 1 hour per candle
    });

    it('caps at maximum candle count', () => {
      // Act
      const count = calculateCandleCount(
        TimeDuration.Max,
        CandlePeriod.OneMinute,
      );

      // Assert
      expect(count).toBe(500); // Should be capped at CANDLE_COUNT.TOTAL
    });

    it('enforces minimum candle count', () => {
      // Act
      const count = calculateCandleCount(
        TimeDuration.OneHour,
        CandlePeriod.OneMonth,
      );

      // Assert
      expect(count).toBe(10); // Should be at least 10 candles minimum
    });
  });

  describe('getCandlestickColors', () => {
    it('returns colors object with positive and negative properties', () => {
      // Arrange
      const mockColors = {
        success: { default: '#00ff00' },
        error: { default: '#ff0000' },
      } as Parameters<typeof getCandlestickColors>[0];

      // Act
      const colors = getCandlestickColors(mockColors);

      // Assert
      expect(colors).toHaveProperty('positive', '#00ff00');
      expect(colors).toHaveProperty('negative', '#ff0000');
    });
  });
});
