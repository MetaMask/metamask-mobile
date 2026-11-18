import BigNumber from 'bignumber.js';
import { DUST_THRESHOLD, moneyFormatUsd } from '../../utils/moneyFormatFiat';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import {
  getBucketDisplayDateRange,
  type EarningsPoint,
  type EarningsRange,
} from './earningsHistory';

type AxisLabelRange = '1W' | '1M' | '3M' | '6M' | '1Y';

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

export const formatSignedUsd = (amountUsd: number): string => {
  if (amountUsd !== 0 && Math.abs(amountUsd) < DUST_THRESHOLD) {
    const preciseAmount = new BigNumber(amountUsd)
      .toFixed(4)
      .replace(/0+$/, '')
      .replace(/\.$/, '');
    return `${amountUsd > 0 ? '+' : ''}$${preciseAmount}`;
  }

  const formattedAmountUsd = moneyFormatUsd(new BigNumber(amountUsd));
  return amountUsd > 0 ? `+${formattedAmountUsd}` : formattedAmountUsd;
};

export const formatMonthLabel = (timestamp: string, locale: string): string =>
  getIntlDateTimeFormatter(locale, {
    month: 'short',
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
  const monthChanged =
    !previous || previous.getUTCMonth() !== start.getUTCMonth();

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

export const formatPointPillLabel = (
  point: EarningsPoint,
  locale: string,
): string =>
  point.granularity === 'week'
    ? formatPointDateRange(point, locale)
    : point.granularity === 'month'
      ? formatMonthLabel(point.start, locale)
      : formatDate(point.start, locale);

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
