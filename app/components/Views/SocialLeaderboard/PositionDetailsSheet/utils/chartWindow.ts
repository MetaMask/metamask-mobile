import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import { formatTradeTime } from '../../../../UI/SocialFeed/utils/formatters';
import { tradeTimestampToMs } from '../../../../UI/SocialFeed/utils/tradeTimestamp';
import {
  PERIOD_DURATION_MS,
  type TimePeriod,
} from '../../TraderPositionView/traderPositionData';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The sheet's default look-back. Widened when the first fill is older. */
export const DEFAULT_CHART_WINDOW_MS = PERIOD_DURATION_MS['1W'];

/** Share of the span added before the first fill so its marker isn't flush. */
const LEADING_PADDING_RATIO = 0.1;

/** Spot price API periods, narrowest first, that can back a widened window. */
const SPOT_PERIODS: readonly TimePeriod[] = ['1W', '1M', 'All'];

export interface ChartWindow {
  startMs: number;
  endMs: number;
}

export function getFirstTradeMs(
  trades: readonly Pick<Trade, 'timestamp'>[] | undefined,
): number | undefined {
  let first: number | undefined;
  for (const trade of trades ?? []) {
    const ms = tradeTimestampToMs(trade.timestamp);
    if (!Number.isFinite(ms)) continue;
    if (first === undefined || ms < first) first = ms;
  }
  return first;
}

/**
 * Seven days ending now, widened to reach back past the first fill so every
 * buy and sell marker stays on the chart.
 */
export function resolveChartWindow(
  trades: readonly Pick<Trade, 'timestamp'>[] | undefined,
  nowMs: number,
): ChartWindow {
  const defaultStartMs = nowMs - DEFAULT_CHART_WINDOW_MS;
  const firstTradeMs = getFirstTradeMs(trades);
  if (firstTradeMs === undefined || firstTradeMs >= defaultStartMs) {
    return { startMs: defaultStartMs, endMs: nowMs };
  }
  const span = nowMs - firstTradeMs;
  return {
    startMs: firstTradeMs - span * LEADING_PADDING_RATIO,
    endMs: nowMs,
  };
}

/** Narrowest spot price API period that covers the whole window. */
export function resolveSpotPeriod(chartWindow: ChartWindow): TimePeriod {
  const span = chartWindow.endMs - chartWindow.startMs;
  return (
    SPOT_PERIODS.find((period) => PERIOD_DURATION_MS[period] >= span) ?? 'All'
  );
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
 * Evenly spaced x-axis labels: weekdays for a one-week window, `Oct 3` style
 * dates once the window is wider than that.
 */
export function buildTimeAxisLabels(
  chartWindow: ChartWindow,
  count: number,
): string[] {
  if (count < 2) return [];
  const span = chartWindow.endMs - chartWindow.startMs;
  const showWeekdays = span <= DEFAULT_CHART_WINDOW_MS + DAY_MS;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(chartWindow.startMs + (span * index) / (count - 1));
    return showWeekdays
      ? strings(`social_leaderboard.position_sheet.weekdays.${date.getDay()}`)
      : `${strings(`date.months.${date.getMonth()}`)} ${date.getDate()}`;
  });
}

/** `Oct 11, 5:17 am`, for the scrubbed point under the price header. */
export function formatChartTimestamp(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${strings(`date.months.${date.getMonth()}`)} ${date.getDate()}, ${formatTradeTime(timestampMs)}`;
}

/** Change over the last 24h, read from the point closest to a day ago. */
export function deriveDailyChangePercent(
  prices: readonly TokenPrice[],
  nowMs: number,
): number | undefined {
  if (prices.length < 2) return undefined;
  const dayAgo = nowMs - DAY_MS;
  const start = prices.reduce(
    (best, point) =>
      Math.abs(Number(point[0]) - dayAgo) < Math.abs(Number(best[0]) - dayAgo)
        ? point
        : best,
    prices[0],
  );
  const end = prices[prices.length - 1];
  if (!start[1]) return undefined;
  return ((end[1] - start[1]) / start[1]) * 100;
}
