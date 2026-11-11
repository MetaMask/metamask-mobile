import { strings } from '../../../../../../locales/i18n';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { formatTradeTime } from '../../../../UI/SocialFeed/utils/formatters';
import { PERIOD_DURATION_MS } from '../../TraderPositionView/traderPositionData';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Past this, an All-range axis uses month and year, matching a multi-year chart. */
const YEAR_AXIS_SPAN_MS = 400 * DAY_MS;

/** Periods the sheet offers. `1D` is the default. */
export const CHART_PERIODS = ['1D', '1W', '1M', 'All'] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

export interface ChartWindow {
  startMs: number;
  endMs: number;
}

/** The selected period, ending now. Fills outside this window are not drawn. */
export function chartWindowForPeriod(
  period: ChartPeriod,
  nowMs: number,
): ChartWindow {
  return { startMs: nowMs - PERIOD_DURATION_MS[period], endMs: nowMs };
}

/**
 * Drops the points before the window. Keeps the full series when trimming
 * would leave too little to draw a line.
 */
export function sliceToWindow(
  prices: readonly TokenPrice[],
  chartWindow: ChartWindow,
): TokenPrice[] {
  const sliced = prices.filter(
    (point) => Number(point[0]) >= chartWindow.startMs,
  );
  return sliced.length >= 2 ? sliced : [...prices];
}

/**
 * Evenly spaced x-axis labels in the same shapes the asset charts use:
 * `HH:mm` on a day, `M/D` on a week or month, and month or month-year on All.
 */
export function buildTimeAxisLabels(
  chartWindow: ChartWindow,
  count: number,
  period: ChartPeriod,
): string[] {
  if (count < 2) return [];
  const span = chartWindow.endMs - chartWindow.startMs;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(chartWindow.startMs + (span * index) / (count - 1));
    return formatAxisLabel(date, period, span);
  });
}

function formatAxisLabel(
  date: Date,
  period: ChartPeriod,
  span: number,
): string {
  if (period === '1D') return formatHourMinute(date);
  if (period === 'All') {
    return span > YEAR_AXIS_SPAN_MS
      ? formatMonthYear(date)
      : strings(`date.months.${date.getMonth()}`);
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 24-hour `HH:mm`, the time tick the asset charts use inside a day. */
function formatHourMinute(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatMonthYear(date: Date): string {
  const month = strings(`date.months.${date.getMonth()}`);
  return `${month} ${date.getFullYear()}`;
}

function formatMonthDay(date: Date): string {
  const month = strings(`date.months.${date.getMonth()}`);
  return `${month} ${date.getDate()}`;
}

/** `Oct 11, 5:17 am`, for the scrubbed point under the price header. */
export function formatChartTimestamp(timestampMs: number): string {
  const date = new Date(timestampMs);
  const monthDay = formatMonthDay(date);
  return `${monthDay}, ${formatTradeTime(timestampMs)}`;
}

/** Change over the last 24h, read from the point closest to a day ago. */
export function deriveDailyChangePercent(
  prices: readonly TokenPrice[],
  nowMs: number,
): number | undefined {
  if (prices.length < 2) return undefined;
  const first = prices.at(0);
  const end = prices.at(-1);
  if (!first || !end || !first[1]) return undefined;

  const dayAgo = nowMs - DAY_MS;
  const start = prices.reduce(
    (best, point) =>
      Math.abs(Number(point[0]) - dayAgo) < Math.abs(Number(best[0]) - dayAgo)
        ? point
        : best,
    first,
  );
  return ((end[1] - start[1]) / start[1]) * 100;
}
