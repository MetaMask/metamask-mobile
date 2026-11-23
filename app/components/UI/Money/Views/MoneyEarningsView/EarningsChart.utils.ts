import BigNumber from 'bignumber.js';
import { DUST_THRESHOLD } from '../../utils/moneyFormatFiat';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import {
  getBucketDisplayDateRange,
  type EarningsPoint,
  type EarningsRange,
} from './earningsHistory';

type AxisLabelRange = '1W' | '1M' | '3M' | '6M' | '1Y';

const CHART_HEIGHT = 160;
const MINIMUM_BAR_HEIGHT = 2;

const fmt = (
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options });

export const formatDate = (timestamp: string, locale: string): string =>
  getIntlDateTimeFormatter(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));

const formatThreeMonthAxisLabel = (start: Date, locale: string): string => {
  const month = fmt(locale, { month: 'short' }).format(start);
  const [firstCharacter, ...remainingCharacters] = Array.from(month);

  return remainingCharacters.length > 0
    ? `${firstCharacter}\n${remainingCharacters.join('')}`
    : month;
};

const axisLabel = (
  range: AxisLabelRange,
  start: Date,
  previous: Date | null,
  locale: string,
): string => {
  const monthChanged = previous?.getUTCMonth() !== start.getUTCMonth();

  switch (range) {
    case '1W':
      return fmt(locale, { weekday: 'narrow' }).format(start);
    case '1M':
      return fmt(locale, { month: 'short', day: 'numeric' }).format(start);
    case '3M':
      return monthChanged ? formatThreeMonthAxisLabel(start, locale) : '';
    case '6M':
      return fmt(locale, { month: 'short' }).format(start);
    case '1Y':
      return fmt(locale, { month: 'narrow' }).format(start);
  }
};

const getAxisLabelRange = (range: EarningsRange): AxisLabelRange =>
  range === '30D' ? '1M' : range;

export const formatPointDateRange = (
  point: EarningsPoint,
  locale: string,
): string => {
  const { displayStart, displayEnd } = getBucketDisplayDateRange(point);
  const startLabel = formatDate(displayStart, locale);
  const endLabel = formatDate(displayEnd, locale);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
};

/**
 * Formats an earnings bucket date for its summary row.
 *
 * @param point - Earnings bucket to format.
 * @param locale - Locale used for the formatted date.
 * @returns A locale-aware date label based on the bucket granularity.
 */
export const formatEarningsPointDate = (
  point: EarningsPoint,
  locale: string,
): string => {
  const { displayStart, displayEnd } = getBucketDisplayDateRange(point);

  switch (point.granularity) {
    case 'day':
      return getIntlDateTimeFormatter(locale, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(displayStart));
    case 'week': {
      const formatter = getIntlDateTimeFormatter(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      const startLabel = formatter.format(new Date(displayStart));
      const endLabel = formatter.format(new Date(displayEnd));

      return startLabel === endLabel
        ? startLabel
        : `${startLabel} – ${endLabel}`;
    }
    case 'month':
      return getIntlDateTimeFormatter(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(displayStart));
  }
};

export const getXAxisLabels = (
  points: EarningsPoint[],
  range: EarningsRange,
  locale: string,
): string[] => {
  const axisRange = getAxisLabelRange(range);

  return points.map((point, index) =>
    axisLabel(
      axisRange,
      new Date(point.start),
      index === 0 ? null : new Date(points[index - 1].start),
      locale,
    ),
  );
};

export const formatAxisUsd = (amountUsd: number): string => {
  if (amountUsd > 0 && amountUsd < DUST_THRESHOLD) {
    return '<$0.01';
  }

  return amountUsd >= 1
    ? `$${Math.round(amountUsd)}`
    : `$${amountUsd.toFixed(2)}`;
};

export const clampUsdToCents = (amountUsd: number): number =>
  Math.abs(amountUsd) < DUST_THRESHOLD
    ? 0
    : Number(new BigNumber(amountUsd).toFixed(2));

export const getNiceUsdChartMaximum = (maximumAmountUsd: number): number => {
  if (maximumAmountUsd <= 0) {
    return DUST_THRESHOLD;
  }

  if (maximumAmountUsd < 1) {
    const cents = Math.ceil(maximumAmountUsd * 100);
    return (cents % 2 === 0 ? cents : cents + 1) / 100;
  }

  const whole = Math.ceil(maximumAmountUsd);
  return whole % 2 === 0 ? whole : whole + 1;
};

/**
 * Calculates the rendered height for an earnings chart bar.
 *
 * @param isAvailable - Whether the earnings bucket has available data.
 * @param chartAmountUsd - The bucket amount in USD, or null when unavailable.
 * @param chartMaximumUsd - The maximum chart amount in USD.
 * @returns The bar height in pixels.
 */
export const getChartBarHeight = (
  isAvailable: boolean,
  chartAmountUsd: number | null,
  chartMaximumUsd: number,
): number => {
  if (!isAvailable) {
    return 0;
  }

  if (chartAmountUsd === 0) {
    return MINIMUM_BAR_HEIGHT;
  }

  if (chartAmountUsd === null || chartMaximumUsd <= 0) {
    return 0;
  }

  return Math.max(
    MINIMUM_BAR_HEIGHT,
    (chartAmountUsd / chartMaximumUsd) * CHART_HEIGHT,
  );
};
