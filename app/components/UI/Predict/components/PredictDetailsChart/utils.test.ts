import { PredictPriceHistoryInterval } from '../../types';
import {
  DEFAULT_EMPTY_LABEL,
  LINE_CURVE,
  CHART_HEIGHT,
  CHART_CONTENT_INSET,
  MAX_SERIES,
  formatPriceHistoryLabel,
  formatTickValue,
  DAY_IN_MS,
} from './utils';

describe('PredictDetailsChart utils', () => {
  describe('constants', () => {
    it('exports empty string as default label', () => {
      expect(DEFAULT_EMPTY_LABEL).toBe('');
    });

    it('exports chart height as 192', () => {
      expect(CHART_HEIGHT).toBe(192);
    });

    it('exports max series as 3', () => {
      expect(MAX_SERIES).toBe(3);
    });

    it('exports chart content inset with expected values', () => {
      expect(CHART_CONTENT_INSET).toEqual({
        top: 8,
        bottom: 4,
        left: 8,
        right: 48,
      });
    });

    it('exports line curve as a function', () => {
      expect(typeof LINE_CURVE).toBe('function');
      expect(LINE_CURVE.alpha).toBeDefined();
    });
  });

  describe('formatPriceHistoryLabel', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Set fixed timezone for consistent test results
      jest.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('with seconds timestamp', () => {
      const createSecondsTimestamp = (dateString: string): number =>
        Math.floor(new Date(dateString).getTime() / 1000);

      it('formats ONE_HOUR interval as time with hour and minute', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T14:30:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_HOUR,
        );

        expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)?$/);
      });

      it('formats SIX_HOUR interval as time with hour and minute', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T09:15:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.SIX_HOUR,
        );

        expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)?$/);
      });

      it('formats ONE_DAY interval as time with hour and minute', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T18:45:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_DAY,
        );

        expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)?$/);
      });

      it('formats ONE_WEEK interval as weekday with AM period for morning hours', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T08:30:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_WEEK,
        );

        expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s(AM|PM)$/);
        expect(result).toContain('AM');
      });

      it('formats ONE_WEEK interval as weekday with PM period for afternoon hours', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T20:00:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_WEEK,
        );

        expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s(AM|PM)$/);
        expect(result).toContain('PM');
      });

      it('formats ONE_WEEK interval as weekday with PM period for noon', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T20:00:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_WEEK,
        );

        expect(result).toContain('PM');
      });

      it('formats ONE_MONTH interval as month and day', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T12:00:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_MONTH,
        );

        expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{1,2}$/);
      });

      it('formats MAX interval as month and 2-digit year', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T12:00:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.MAX,
        );

        expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{2}$/);
      });

      it('formats MAX interval with month and day when time range is under 30 days', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T12:00:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.MAX,
          { timeRangeMs: 15 * DAY_IN_MS },
        );

        expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{1,2}$/);
      });

      it('formats MAX interval with time when time range is under 1 day', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T12:00:00.000Z');

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.MAX,
          { timeRangeMs: 0.5 * DAY_IN_MS },
        );

        expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)?$/);
      });

      it('formats unknown interval as month and 2-digit year', () => {
        const timestamp = createSecondsTimestamp('2024-01-15T12:00:00.000Z');

        const result = formatPriceHistoryLabel(timestamp, 'unknown-interval');

        expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{2}$/);
      });
    });

    describe('with milliseconds timestamp', () => {
      it('formats milliseconds timestamp for ONE_HOUR interval', () => {
        const timestamp = new Date('2024-01-15T14:30:00.000Z').getTime();

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_HOUR,
        );

        expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)?$/);
      });

      it('formats milliseconds timestamp for ONE_WEEK interval', () => {
        const timestamp = new Date('2024-01-15T14:30:00.000Z').getTime();

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_WEEK,
        );

        expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s(AM|PM)$/);
      });

      it('formats milliseconds timestamp for ONE_MONTH interval', () => {
        const timestamp = new Date('2024-01-15T12:00:00.000Z').getTime();

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_MONTH,
        );

        expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{1,2}$/);
      });

      it('formats milliseconds timestamp for MAX interval', () => {
        const timestamp = new Date('2024-01-15T12:00:00.000Z').getTime();

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.MAX,
        );

        expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{2}$/);
      });
    });

    describe('edge cases', () => {
      it('handles timestamp at midnight for ONE_WEEK interval with AM period', () => {
        const timestamp = Math.floor(
          new Date('2024-01-15T08:00:00.000Z').getTime() / 1000,
        );

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_WEEK,
        );

        expect(result).toContain('AM');
      });

      it('handles timestamp at 11:59 AM for ONE_WEEK interval with AM period', () => {
        const timestamp = Math.floor(
          new Date('2024-01-15T11:59:00.000Z').getTime() / 1000,
        );

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_WEEK,
        );

        expect(result).toContain('AM');
      });

      it('handles timestamp with zero seconds', () => {
        const timestamp = 0;

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.ONE_MONTH,
        );

        expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{1,2}$/);
      });

      it('handles large milliseconds timestamp', () => {
        const timestamp = 9_999_999_999_999;

        const result = formatPriceHistoryLabel(
          timestamp,
          PredictPriceHistoryInterval.MAX,
        );

        expect(result).toMatch(/^[A-Z][a-z]{2}\s\d{2}$/);
      });
    });

    describe('parameterized interval tests', () => {
      it.each([
        PredictPriceHistoryInterval.ONE_HOUR,
        PredictPriceHistoryInterval.SIX_HOUR,
        PredictPriceHistoryInterval.ONE_DAY,
      ])(
        'formats %s interval with consistent time format',
        (interval: PredictPriceHistoryInterval) => {
          const timestamp = Math.floor(
            new Date('2024-01-15T14:30:00.000Z').getTime() / 1000,
          );

          const result = formatPriceHistoryLabel(timestamp, interval);

          expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)?$/);
        },
      );
    });
  });

  describe('formatTickValue', () => {
    describe('with non-finite values', () => {
      it('returns 0 string when value is NaN', () => {
        const result = formatTickValue(NaN, 5);

        expect(result).toBe('0');
      });

      it('returns 0 string when value is positive Infinity', () => {
        const result = formatTickValue(Infinity, 5);

        expect(result).toBe('0');
      });

      it('returns 0 string when value is negative Infinity', () => {
        const result = formatTickValue(-Infinity, 5);

        expect(result).toBe('0');
      });
    });

    describe('with range less than 1', () => {
      it('returns value with 2 decimal places when range is 0.5', () => {
        const result = formatTickValue(0.12345, 0.5);

        expect(result).toBe('0.12');
      });

      it('returns value with 2 decimal places when range is 0.99', () => {
        const result = formatTickValue(0.56789, 0.99);

        expect(result).toBe('0.57');
      });

      it('returns value with 2 decimal places when range is 0', () => {
        const result = formatTickValue(0.123, 0);

        expect(result).toBe('0.12');
      });

      it('rounds up correctly for 2 decimal places', () => {
        const result = formatTickValue(0.126, 0.5);

        expect(result).toBe('0.13');
      });
    });

    describe('with range between 1 and 10', () => {
      it('returns value with 1 decimal place when range is 5', () => {
        const result = formatTickValue(3.456, 5);

        expect(result).toBe('3.5');
      });

      it('returns value with 1 decimal place when range is 1', () => {
        const result = formatTickValue(1.234, 1);

        expect(result).toBe('1.2');
      });

      it('returns value with 1 decimal place when range is 9.99', () => {
        const result = formatTickValue(7.89, 9.99);

        expect(result).toBe('7.9');
      });

      it('rounds up correctly for 1 decimal place', () => {
        const result = formatTickValue(3.46, 5);

        expect(result).toBe('3.5');
      });
    });

    describe('with range of 10 or greater', () => {
      it('returns value with 0 decimal places when range is 10', () => {
        const result = formatTickValue(15.678, 10);

        expect(result).toBe('16');
      });

      it('returns value with 0 decimal places when range is 100', () => {
        const result = formatTickValue(42.3, 100);

        expect(result).toBe('42');
      });

      it('returns value with 0 decimal places when range is 1000', () => {
        const result = formatTickValue(999.9, 1000);

        expect(result).toBe('1000');
      });

      it('rounds down correctly for 0 decimal places', () => {
        const result = formatTickValue(15.4, 10);

        expect(result).toBe('15');
      });
    });

    describe('edge cases', () => {
      it('handles zero value with small range', () => {
        const result = formatTickValue(0, 0.5);

        expect(result).toBe('0.00');
      });

      it('handles zero value with large range', () => {
        const result = formatTickValue(0, 100);

        expect(result).toBe('0');
      });

      it('handles negative value with range less than 1', () => {
        const result = formatTickValue(-0.456, 0.5);

        expect(result).toBe('-0.46');
      });

      it('handles negative value with range between 1 and 10', () => {
        const result = formatTickValue(-5.67, 5);

        expect(result).toBe('-5.7');
      });

      it('handles negative value with range of 10 or greater', () => {
        const result = formatTickValue(-42.8, 50);

        expect(result).toBe('-43');
      });

      it('handles very small positive value', () => {
        const result = formatTickValue(0.0001, 0.5);

        expect(result).toBe('0.00');
      });

      it('handles very large value', () => {
        const result = formatTickValue(999999.999, 1000000);

        expect(result).toBe('1000000');
      });
    });

    describe('parameterized range tests', () => {
      it.each([
        [0.5, '0.12'],
        [0.8, '0.12'],
        [0.99, '0.12'],
      ])(
        'formats value with 2 decimals when range is %f',
        (range: number, expected: string) => {
          const result = formatTickValue(0.123, range);

          expect(result).toBe(expected);
        },
      );

      it.each([
        [1, '5.7'],
        [5, '5.7'],
        [9.5, '5.7'],
      ])(
        'formats value with 1 decimal when range is %f',
        (range: number, expected: string) => {
          const result = formatTickValue(5.68, range);

          expect(result).toBe(expected);
        },
      );

      it.each([
        [10, '6'],
        [50, '6'],
        [1000, '6'],
      ])(
        'formats value with 0 decimals when range is %f',
        (range: number, expected: string) => {
          const result = formatTickValue(5.68, range);

          expect(result).toBe(expected);
        },
      );
    });
  });
});
