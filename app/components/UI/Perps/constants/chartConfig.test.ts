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
      const periods = getCandlePeriodsForDuration(TimeDuration.ONE_HOUR);

      // Assert
      expect(periods).toHaveLength(4);
      expect(periods[0]?.value).toBe(CandlePeriod.ONE_MINUTE);
      expect(periods[1]?.value).toBe(CandlePeriod.THREE_MINUTES);
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
        TimeDuration.ONE_DAY,
      );

      // Assert
      expect(defaultPeriod).toBe(CandlePeriod.ONE_HOUR);
    });

    it('returns fallback for unknown duration', () => {
      // Act
      const defaultPeriod = getDefaultCandlePeriodForDuration('unknown');

      // Assert
      expect(defaultPeriod).toBe(CandlePeriod.ONE_HOUR);
    });
  });

  describe('calculateCandleCount', () => {
    it('calculates correct count for one hour with one minute periods', () => {
      // Act
      const count = calculateCandleCount(
        TimeDuration.ONE_HOUR,
        CandlePeriod.ONE_MINUTE,
      );

      // Assert
      expect(count).toBe(60); // 60 minutes / 1 minute per candle
    });

    it('calculates correct count for one day with one hour periods', () => {
      // Act
      const count = calculateCandleCount(
        TimeDuration.ONE_DAY,
        CandlePeriod.ONE_HOUR,
      );

      // Assert
      expect(count).toBe(24); // 24 hours / 1 hour per candle
    });

    it('caps at maximum candle count', () => {
      // Act
      const count = calculateCandleCount(
        TimeDuration.MAX,
        CandlePeriod.ONE_MINUTE,
      );

      // Assert
      expect(count).toBe(500); // Should be capped at CANDLE_COUNT.TOTAL
    });

    it('enforces minimum candle count', () => {
      // Act
      const count = calculateCandleCount(
        TimeDuration.ONE_HOUR,
        CandlePeriod.ONE_MONTH,
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
