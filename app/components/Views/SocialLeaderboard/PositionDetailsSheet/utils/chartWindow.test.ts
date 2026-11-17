import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { DAY_MS, NOW_MS } from '../positionDetailsSheet.fixtures';
import {
  buildTimeAxisLabels,
  chartWindowForPeriod,
  deriveDailyChangePercent,
  formatChartTimestamp,
  sliceToWindow,
} from './chartWindow';

describe('chartWindow', () => {
  describe('chartWindowForPeriod', () => {
    it('ends now and looks back one day by default', () => {
      expect(chartWindowForPeriod('1D', NOW_MS)).toEqual({
        startMs: NOW_MS - DAY_MS,
        endMs: NOW_MS,
      });
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
    it('labels a day with hours and minutes', () => {
      const labels = buildTimeAxisLabels(
        { startMs: NOW_MS - DAY_MS, endMs: NOW_MS },
        4,
        '1D',
      );
      const end = new Date(NOW_MS);
      const endLabel = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;

      expect(labels).toHaveLength(4);
      expect(labels[3]).toBe(endLabel);
      labels.forEach((label) => expect(label).toMatch(/^\d{2}:\d{2}$/));
    });

    it('labels a week with numeric month and day', () => {
      const labels = buildTimeAxisLabels(
        { startMs: NOW_MS - 7 * DAY_MS, endMs: NOW_MS },
        2,
        '1W',
      );
      const end = new Date(NOW_MS);

      expect(labels[1]).toBe(`${end.getMonth() + 1}/${end.getDate()}`);
    });

    it('labels a multi-year window with month and year', () => {
      const labels = buildTimeAxisLabels(
        { startMs: NOW_MS - 3 * 365 * DAY_MS, endMs: NOW_MS },
        2,
        'All',
      );
      const end = new Date(NOW_MS);

      expect(labels[1]).toBe(`Oct ${end.getFullYear()}`);
    });

    it('returns no labels for fewer than two slots', () => {
      expect(
        buildTimeAxisLabels({ startMs: 0, endMs: NOW_MS }, 1, '1D'),
      ).toEqual([]);
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
