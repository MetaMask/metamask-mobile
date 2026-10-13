import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { DAY_MS, NOW_MS, buildTrade } from '../positionDetailsSheet.fixtures';
import {
  DEFAULT_CHART_WINDOW_MS,
  buildTimeAxisLabels,
  deriveDailyChangePercent,
  formatChartTimestamp,
  getFirstTradeMs,
  resolveChartWindow,
  resolveSpotPeriod,
  sliceToWindow,
} from './chartWindow';

describe('chartWindow', () => {
  describe('getFirstTradeMs', () => {
    it('returns the earliest fill, normalising second timestamps', () => {
      const trades = [
        buildTrade({ timestamp: (NOW_MS - DAY_MS) / 1000 }),
        buildTrade({ timestamp: NOW_MS - 3 * DAY_MS }),
      ];

      expect(getFirstTradeMs(trades)).toBe(NOW_MS - 3 * DAY_MS);
    });

    it('returns undefined without trades', () => {
      expect(getFirstTradeMs(undefined)).toBeUndefined();
      expect(getFirstTradeMs([])).toBeUndefined();
    });
  });

  describe('resolveChartWindow', () => {
    it('uses the last seven days when every fill falls inside them', () => {
      const result = resolveChartWindow(
        [buildTrade({ timestamp: NOW_MS - 2 * DAY_MS })],
        NOW_MS,
      );

      expect(result).toEqual({
        startMs: NOW_MS - DEFAULT_CHART_WINDOW_MS,
        endMs: NOW_MS,
      });
    });

    it('widens to reach past a fill older than seven days', () => {
      const firstTradeMs = NOW_MS - 20 * DAY_MS;

      const result = resolveChartWindow(
        [buildTrade({ timestamp: firstTradeMs })],
        NOW_MS,
      );

      expect(result.endMs).toBe(NOW_MS);
      expect(result.startMs).toBe(firstTradeMs - 2 * DAY_MS);
    });
  });

  describe('resolveSpotPeriod', () => {
    it.each([
      [7 * DAY_MS, '1W'],
      [20 * DAY_MS, '1M'],
      [90 * DAY_MS, 'All'],
    ])('maps a %d ms span to %s', (span, expected) => {
      expect(resolveSpotPeriod({ startMs: NOW_MS - span, endMs: NOW_MS })).toBe(
        expected,
      );
    });
  });

  describe('sliceToWindow', () => {
    const prices: TokenPrice[] = [
      [String(NOW_MS - 10 * DAY_MS), 1],
      [String(NOW_MS - 2 * DAY_MS), 2],
      [String(NOW_MS - DAY_MS), 3],
    ];

    it('drops points before the window', () => {
      expect(
        sliceToWindow(prices, { startMs: NOW_MS - 7 * DAY_MS, endMs: NOW_MS }),
      ).toEqual(prices.slice(1));
    });

    it('keeps the full series when trimming leaves fewer than two points', () => {
      expect(
        sliceToWindow(prices, { startMs: NOW_MS - DAY_MS, endMs: NOW_MS }),
      ).toEqual(prices);
    });
  });

  describe('buildTimeAxisLabels', () => {
    it('labels a one-week window with weekdays', () => {
      const labels = buildTimeAxisLabels(
        { startMs: NOW_MS - 7 * DAY_MS, endMs: NOW_MS },
        4,
      );

      expect(labels).toHaveLength(4);
      labels.forEach((label) =>
        expect(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).toContain(
          label,
        ),
      );
    });

    it('labels a wider window with month and day', () => {
      const labels = buildTimeAxisLabels(
        { startMs: NOW_MS - 30 * DAY_MS, endMs: NOW_MS },
        2,
      );

      expect(labels[1]).toMatch(/^Oct \d{1,2}$/);
    });

    it('returns no labels for fewer than two slots', () => {
      expect(buildTimeAxisLabels({ startMs: 0, endMs: NOW_MS }, 1)).toEqual([]);
    });
  });

  describe('formatChartTimestamp', () => {
    it('prefixes the time with month and day', () => {
      expect(formatChartTimestamp(NOW_MS)).toMatch(/^Oct 1[23], /);
    });
  });

  describe('deriveDailyChangePercent', () => {
    it('compares the latest point with the one closest to a day ago', () => {
      const prices: TokenPrice[] = [
        [String(NOW_MS - 2 * DAY_MS), 50],
        [String(NOW_MS - DAY_MS), 100],
        [String(NOW_MS), 110],
      ];

      expect(deriveDailyChangePercent(prices, NOW_MS)).toBeCloseTo(10);
    });

    it('returns undefined without enough points', () => {
      expect(
        deriveDailyChangePercent([[String(NOW_MS), 1]], NOW_MS),
      ).toBeUndefined();
    });
  });
});
