import type { EarningsPoint } from './earningsHistory';
import { formatSignedUsd } from '../../utils/moneyFormatFiat';
import {
  clampUsdToCents,
  formatAxisUsd,
  formatDate,
  formatEarningsPointDate,
  formatPointDateRange,
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
      [
        'day',
        '2026-11-19T00:00:00.000Z',
        '2026-11-20T00:00:00.000Z',
        'Thursday, Nov 19, 2026',
      ],
      [
        'week',
        '2026-11-13T00:00:00.000Z',
        '2026-11-20T00:00:00.000Z',
        'Nov 13, 2026 – Nov 19, 2026',
      ],
      [
        'month',
        '2026-11-13T00:00:00.000Z',
        '2026-11-20T00:00:00.000Z',
        'November 2026',
      ],
    ] as const)(
      'formats %s earnings row dates',
      (granularity, start, periodEndExclusive, expected) => {
        const point = createPoint({
          start,
          periodEndExclusive,
          granularity,
        });

        const result = formatEarningsPointDate(point, 'en-US');

        expect(result).toBe(expected);
      },
    );

    it('formats weekly earnings rows without DateTimeFormat.formatRange', () => {
      const formatRangeDescriptor = Object.getOwnPropertyDescriptor(
        Intl.DateTimeFormat.prototype,
        'formatRange',
      );

      Object.defineProperty(Intl.DateTimeFormat.prototype, 'formatRange', {
        configurable: true,
        value: undefined,
      });

      try {
        const result = formatEarningsPointDate(
          createPoint({
            start: '2026-11-13T00:00:00.000Z',
            periodEndExclusive: '2026-11-20T00:00:00.000Z',
            granularity: 'week',
          }),
          'en-US',
        );

        expect(result).toBe('Nov 13, 2026 – Nov 19, 2026');
      } finally {
        if (formatRangeDescriptor) {
          Object.defineProperty(
            Intl.DateTimeFormat.prototype,
            'formatRange',
            formatRangeDescriptor,
          );
        } else {
          Reflect.deleteProperty(Intl.DateTimeFormat.prototype, 'formatRange');
        }
      }
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
