import type { EarningsPoint } from './earningsHistory';
import { formatSignedUsd } from '../../utils/moneyFormatFiat';
import {
  clampUsdToCents,
  formatAxisUsd,
  formatDate,
  formatMonthLabel,
  formatPointDateRange,
  formatPointPillLabel,
  getNiceUsdChartMaximum,
  getXAxisLabels,
} from './EarningsChart.utils';

const createPoint = (
  overrides: Partial<EarningsPoint> = {},
): EarningsPoint => ({
  start: '2026-11-09T00:00:00.000Z',
  periodEndExclusive: '2026-11-10T00:00:00.000Z',
  timestamp: '2026-11-09T00:00:00.000Z',
  amountUsd: 1,
  granularity: 'day',
  periodStatus: 'complete',
  availability: {
    earnings: 'available',
    usd_pricing: 'available',
  },
  unavailableReasons: [],
  ...overrides,
});

describe('EarningsChart.utils', () => {
  describe('currency formatting', () => {
    it('formats signed dollar amounts, including sub-cent values', () => {
      expect(formatSignedUsd(12.34)).toBe('+$12.34');
      expect(formatSignedUsd(0)).toBe('$0.00');
      expect(formatSignedUsd(0.001)).toBe('+$0.001');
    });

    it('formats axis values and preserves sub-cent precision', () => {
      expect(formatAxisUsd(12.6)).toBe('$13');
      expect(formatAxisUsd(0.5)).toBe('$0.50');
      expect(formatAxisUsd(0.001)).toBe('<$0.01');
    });

    it('clamps chart values to cents while preserving regular amounts', () => {
      expect(clampUsdToCents(0.001)).toBe(0);
      expect(clampUsdToCents(12.345)).toBe(12.35);
      expect(clampUsdToCents(-12.345)).toBe(-12.35);
    });

    it('chooses an even chart maximum for positive values', () => {
      expect(getNiceUsdChartMaximum(0)).toBe(0.01);
      expect(getNiceUsdChartMaximum(0.011)).toBe(0.02);
      expect(getNiceUsdChartMaximum(3)).toBe(4);
      expect(getNiceUsdChartMaximum(4)).toBe(4);
    });
  });

  describe('date formatting', () => {
    it('formats dates in UTC', () => {
      expect(formatDate('2026-11-09T23:00:00.000Z', 'en-US')).toBe('Nov 9');
      expect(formatMonthLabel('2026-11-09T23:00:00.000Z', 'en-US')).toBe('Nov');
    });

    it('formats a point date range using the exclusive period end', () => {
      expect(
        formatPointDateRange(
          createPoint({
            periodEndExclusive: '2026-11-16T00:00:00.000Z',
          }),
          'en-US',
        ),
      ).toBe('Nov 9 – Nov 15');
    });

    it.each([
      ['day', 'Nov 9'],
      ['week', 'Nov 9 – Nov 15'],
      ['month', 'Nov'],
    ] as const)('formats %s pill labels', (granularity, expected) => {
      expect(
        formatPointPillLabel(
          createPoint({
            granularity,
            periodEndExclusive: '2026-11-16T00:00:00.000Z',
          }),
          'en-US',
        ),
      ).toBe(expected);
    });
  });

  describe('x-axis labels', () => {
    const points = [
      createPoint({ start: '2026-11-09T00:00:00.000Z' }),
      createPoint({ start: '2026-11-10T00:00:00.000Z' }),
      createPoint({ start: '2026-12-01T00:00:00.000Z' }),
    ];

    it('formats labels for weekly and monthly ranges', () => {
      expect(getXAxisLabels(points, '1W', 'en-US')).toEqual(['M', 'T', 'T']);
      expect(getXAxisLabels(points, '30D', 'en-US')).toEqual([
        'Nov 9',
        'Nov 10',
        'Dec 1',
      ]);
      expect(getXAxisLabels(points, '6M', 'en-US')).toEqual([
        'Nov',
        'Nov',
        'Dec',
      ]);
    });

    it('only labels month changes for the three-month range', () => {
      expect(getXAxisLabels(points, '3M', 'en-US')).toEqual([
        'N\nov',
        '',
        'D\nec',
      ]);
    });
  });
});
