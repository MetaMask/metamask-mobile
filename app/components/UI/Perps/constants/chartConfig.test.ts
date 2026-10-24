import {
  CandlePeriod,
  TimeDuration,
  getCandlePeriodsForDuration,
  getDefaultCandlePeriodForDuration,
  calculateCandleCount,
} from '@metamask/perps-controller';
import {
  getCandlestickColors,
  clampVisibleCandleCount,
  isPerpsNativeTradingViewSpikeEnabled,
  shouldUsePerpsNativeTradingView,
} from './chartConfig';
import { mockTheme } from '../../../../util/theme';

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

  describe('clampVisibleCandleCount', () => {
    it('returns the default for non-finite values', () => {
      expect(clampVisibleCandleCount(Number.NaN)).toBe(30);
    });

    it('clamps below the minimum to 10', () => {
      expect(clampVisibleCandleCount(3)).toBe(10);
    });

    it('clamps above the maximum to 250', () => {
      expect(clampVisibleCandleCount(400)).toBe(250);
    });

    it('rounds a fractional count', () => {
      expect(clampVisibleCandleCount(42.6)).toBe(43);
    });
  });

  describe('getCandlestickColors', () => {
    it('returns colors object with positive and negative properties', () => {
      // Arrange
      const mockColors = mockTheme.colors as Parameters<
        typeof getCandlestickColors
      >[0];

      // Act
      const colors = getCandlestickColors(mockColors);

      // Assert
      expect(colors).toHaveProperty(
        'positive',
        mockTheme.colors.success.default,
      );
      expect(colors).toHaveProperty('negative', mockTheme.colors.error.default);
    });
  });

  describe('isPerpsNativeTradingViewSpikeEnabled', () => {
    it('returns true for a dev build with the spike flag set to true', () => {
      const result = isPerpsNativeTradingViewSpikeEnabled('true', true);

      expect(result).toBe(true);
    });

    it('returns false for a dev build without the spike flag', () => {
      const result = isPerpsNativeTradingViewSpikeEnabled(undefined, true);

      expect(result).toBe(false);
    });

    it('returns false for a dev build with the spike flag set to false', () => {
      const result = isPerpsNativeTradingViewSpikeEnabled('false', true);

      expect(result).toBe(false);
    });

    it('returns false for a release build even with the spike flag set', () => {
      const result = isPerpsNativeTradingViewSpikeEnabled('true', false);

      expect(result).toBe(false);
    });
  });

  describe('shouldUsePerpsNativeTradingView', () => {
    it.each([
      ['HIGH', 'WIFI'],
      ['MID', 'SLOW_CELLULAR'],
      ['LOW', null],
      [null, 'FAST_CELLULAR'],
      [null, null],
    ] as const)(
      'renders the native chart for %s hardware on %s network',
      (hardwareTier, networkTier) => {
        const result = shouldUsePerpsNativeTradingView(
          true,
          hardwareTier,
          networkTier,
        );

        expect(result).toBe(true);
      },
    );

    it.each([
      ['HIGH', 'NONE'],
      [null, 'NONE'],
      ['LOW', 'SLOW_CELLULAR'],
      ['LOW', 'WIFI'],
    ] as const)(
      'keeps the existing chart for %s hardware on %s network',
      (hardwareTier, networkTier) => {
        const result = shouldUsePerpsNativeTradingView(
          true,
          hardwareTier,
          networkTier,
        );

        expect(result).toBe(false);
      },
    );

    it('keeps the existing chart when the spike flag is off', () => {
      const result = shouldUsePerpsNativeTradingView(false, 'HIGH', 'WIFI');

      expect(result).toBe(false);
    });
  });
});
