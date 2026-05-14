import {
  parseRecurrenceToSeconds,
  SERIES_PAST_WINDOW_MS,
  SERIES_FUTURE_WINDOW_MS,
  SERIES_MAX_EVENTS,
  DEFAULT_SERIES_MARKET_DURATION_MS,
  findLiveMarket,
  findNearestMarket,
  formatSeriesMarketCountdown,
  getCurrentSeriesWindowMs,
  getSeriesDurationMs,
  getSeriesMarketWindow,
  getSeriesMarketProgressRemaining,
  getSeriesMarketTimeRemainingMs,
  resolvePredictMarketFromSeries,
  resolvePredictSeriesMarket,
} from './series';
import { Recurrence, type PredictMarket, type PredictSeries } from '../types';

const SERIES: PredictSeries = {
  id: 'btc-series',
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down',
  recurrence: '5m',
};

const createMarket = (
  id: string,
  endDate?: string,
): PredictMarket & { series: PredictSeries } =>
  ({
    id,
    providerId: 'polymarket',
    slug: id,
    title: id,
    description: id,
    image: '',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: [],
    outcomes: [],
    liquidity: 0,
    volume: 0,
    endDate,
    series: SERIES,
  }) as PredictMarket & { series: PredictSeries };

describe('series utilities', () => {
  describe('parseRecurrenceToSeconds', () => {
    it.each([
      ['5m', 300],
      ['15m', 900],
      ['30m', 1800],
      ['1h', 3600],
      ['4h', 14400],
      ['hourly', 3600],
      ['daily', 86400],
      ['weekly', 604800],
      ['Daily', 86400],
      ['WEEKLY', 604800],
      ['Hourly', 3600],
      ['', 0],
      ['unknown', 0],
    ])('converts %s to %d seconds', (input, expected) => {
      // Arrange
      const recurrence = input;

      // Act
      const result = parseRecurrenceToSeconds(recurrence);

      // Assert
      expect(result).toBe(expected);
    });
  });

  describe('exported constants', () => {
    it('exports SERIES_PAST_WINDOW_MS with correct value', () => {
      // Arrange
      const expectedValue = 108000000; // 30 * 60 * 60 * 1000

      // Act & Assert
      expect(SERIES_PAST_WINDOW_MS).toBe(expectedValue);
    });

    it('exports SERIES_FUTURE_WINDOW_MS with correct value', () => {
      // Arrange
      const expectedValue = 86400000; // 24 * 60 * 60 * 1000

      // Act & Assert
      expect(SERIES_FUTURE_WINDOW_MS).toBe(expectedValue);
    });

    it('exports SERIES_MAX_EVENTS with correct value', () => {
      // Arrange
      const expectedValue = 50;

      // Act & Assert
      expect(SERIES_MAX_EVENTS).toBe(expectedValue);
    });
  });

  describe('series market windows', () => {
    it('computes duration from recurrence with a 5m fallback', () => {
      expect(getSeriesDurationMs('15m')).toBe(15 * 60 * 1000);
      expect(getSeriesDurationMs('unknown')).toBe(
        DEFAULT_SERIES_MARKET_DURATION_MS,
      );
    });

    it('rounds current time to the active recurrence window', () => {
      expect(getCurrentSeriesWindowMs(5 * 60 * 1000, 305_000)).toBe(300_000);
    });

    it('builds the lookback and lookahead date range around an anchor', () => {
      expect(
        getSeriesMarketWindow({
          anchorMs: Date.UTC(2026, 0, 1, 0, 15, 0),
          durationMs: 5 * 60 * 1000,
        }),
      ).toEqual({
        endDateMin: '2026-01-01T00:00:00.000Z',
        endDateMax: '2026-01-01T01:05:00.000Z',
      });
    });

    it('formats time remaining values for display', () => {
      expect(
        getSeriesMarketTimeRemainingMs(
          '2026-01-01T00:05:01.000Z',
          Date.UTC(2026, 0, 1, 0, 4, 0),
        ),
      ).toBe(61_000);
      expect(
        formatSeriesMarketCountdown(
          '2026-01-01T00:05:01.000Z',
          Date.UTC(2026, 0, 1, 0, 4, 0),
        ),
      ).toBe('1:01');
      expect(formatSeriesMarketCountdown(undefined)).toBe('--:--');
    });

    it('computes the remaining progress ratio', () => {
      expect(
        getSeriesMarketProgressRemaining(
          '2026-01-01T00:04:00.000Z',
          5 * 60 * 1000,
          Date.UTC(2026, 0, 1, 0, 2, 0),
        ),
      ).toBe(0.4);
    });
  });

  describe('market resolution', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('finds the soonest future market as live', () => {
      const later = createMarket('later', '2026-01-01T00:10:00.000Z');
      const live = createMarket('live', '2026-01-01T00:05:00.000Z');

      expect(findLiveMarket([later, live])).toBe(live);
    });

    it('falls back to nearest market when no live market exists', () => {
      const older = createMarket('older', '2025-12-31T23:00:00.000Z');
      const nearest = createMarket('nearest', '2025-12-31T23:58:00.000Z');

      expect(findNearestMarket([older, nearest])).toBe(nearest);
    });

    it('resolves a source market against fresh series markets', () => {
      const source = createMarket('source', '2025-12-31T23:55:00.000Z');
      const live = createMarket('live', '2026-01-01T00:05:00.000Z');

      expect(resolvePredictSeriesMarket(source, [source, live])).toEqual(live);
    });

    it('resolves a route series to its current market', () => {
      const live = createMarket('live', '2026-01-01T00:05:00.000Z');

      expect(resolvePredictMarketFromSeries([live], SERIES)).toEqual(live);
    });
  });
});
