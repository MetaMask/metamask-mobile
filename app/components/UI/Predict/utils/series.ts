import type { PredictMarket, PredictSeries } from '../types';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_WEEK = 604800;

const RECURRENCE_MAP: Record<string, number> = {
  '5m': 5 * SECONDS_PER_MINUTE,
  '15m': 15 * SECONDS_PER_MINUTE,
  '30m': 30 * SECONDS_PER_MINUTE,
  '1h': SECONDS_PER_HOUR,
  '4h': 4 * SECONDS_PER_HOUR,
  hourly: SECONDS_PER_HOUR,
  daily: SECONDS_PER_DAY,
  weekly: SECONDS_PER_WEEK,
};

export function parseRecurrenceToSeconds(recurrence: string): number {
  return RECURRENCE_MAP[recurrence.toLowerCase()] ?? 0;
}

export const SERIES_PAST_WINDOW_MS = 30 * 60 * 60 * 1000;
export const SERIES_FUTURE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SERIES_MAX_EVENTS = 50;

export const DEFAULT_SERIES_MARKET_DURATION_MS = 5 * SECONDS_PER_MINUTE * 1000;
export const SERIES_MARKET_WINDOW_LOOKBACK = 3;
export const SERIES_MARKET_WINDOW_LOOKAHEAD = 10;

export type PredictMarketWithSeries = PredictMarket & { series: PredictSeries };

export const getSeriesDurationMs = (recurrence?: string): number => {
  const durationSecs = recurrence ? parseRecurrenceToSeconds(recurrence) : 0;
  return durationSecs > 0
    ? durationSecs * 1000
    : DEFAULT_SERIES_MARKET_DURATION_MS;
};

export const getCurrentSeriesWindowMs = (
  durationMs: number,
  nowMs = Date.now(),
): number => {
  if (!Number.isFinite(nowMs) || durationMs <= 0) {
    return 0;
  }

  return Math.floor(nowMs / durationMs) * durationMs;
};

export const getSeriesMarketWindow = ({
  anchorMs,
  durationMs,
  lookback = SERIES_MARKET_WINDOW_LOOKBACK,
  lookahead = SERIES_MARKET_WINDOW_LOOKAHEAD,
}: {
  anchorMs: number;
  durationMs: number;
  lookback?: number;
  lookahead?: number;
}) => ({
  endDateMin: new Date(anchorMs - lookback * durationMs).toISOString(),
  endDateMax: new Date(anchorMs + lookahead * durationMs).toISOString(),
});

export const getSeriesMarketTimeRemainingMs = (
  endDate?: string,
  nowMs = Date.now(),
): number | undefined => {
  if (!endDate) {
    return undefined;
  }

  const endDateMs = new Date(endDate).getTime();
  if (!Number.isFinite(endDateMs)) {
    return undefined;
  }

  return Math.max(0, endDateMs - nowMs);
};

export const formatSeriesMarketCountdown = (
  endDate?: string,
  nowMs = Date.now(),
): string => {
  const remainingMs = getSeriesMarketTimeRemainingMs(endDate, nowMs);
  if (typeof remainingMs !== 'number') {
    return '--:--';
  }

  if (remainingMs <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor(
    (totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE,
  );
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const pluralize = (count: number, unit: string): string =>
  `${count} ${unit}${count === 1 ? '' : 's'}`;

export const formatSeriesDuration = (durationMs: number): string => {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return '--';
  }

  const totalSeconds = Math.round(durationMs / 1000);

  if (
    totalSeconds >= SECONDS_PER_WEEK &&
    totalSeconds % SECONDS_PER_WEEK === 0
  ) {
    return pluralize(totalSeconds / SECONDS_PER_WEEK, 'week');
  }

  if (totalSeconds >= SECONDS_PER_DAY && totalSeconds % SECONDS_PER_DAY === 0) {
    return pluralize(totalSeconds / SECONDS_PER_DAY, 'day');
  }

  if (
    totalSeconds >= SECONDS_PER_HOUR &&
    totalSeconds % SECONDS_PER_HOUR === 0
  ) {
    return pluralize(totalSeconds / SECONDS_PER_HOUR, 'hour');
  }

  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  if (seconds > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes} min`;
};

export const getSeriesMarketProgressRemaining = (
  endDate: string | undefined,
  durationMs: number,
  nowMs = Date.now(),
): number => {
  if (durationMs <= 0) {
    return 0;
  }

  const remainingMs = getSeriesMarketTimeRemainingMs(endDate, nowMs);
  if (typeof remainingMs !== 'number') {
    return 0;
  }

  return Math.min(remainingMs / durationMs, 1);
};

/**
 * Returns the market with the smallest positive time remaining (i.e. the
 * market that is currently live). Returns `undefined` when no market has a
 * future endDate.
 */
export const findLiveMarket = (
  markets: PredictMarket[],
): PredictMarket | undefined => {
  const now = Date.now();
  let closest: PredictMarket | undefined;
  let closestDiff = Infinity;

  for (const market of markets) {
    if (!market.endDate) continue;

    const diff = new Date(market.endDate).getTime() - now;
    if (diff > 0 && diff < closestDiff) {
      closestDiff = diff;
      closest = market;
    }
  }

  return closest;
};

/**
 * Returns the market whose endDate is closest to now (past or future).
 * Falls back to the first market in the array when none have an endDate.
 */
export const findNearestMarket = (
  markets: PredictMarket[],
): PredictMarket | undefined => {
  if (markets.length === 0) return undefined;

  const now = Date.now();
  let nearest: PredictMarket | undefined;
  let nearestDiff = Infinity;

  for (const market of markets) {
    if (!market.endDate) continue;

    const diff = Math.abs(new Date(market.endDate).getTime() - now);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearest = market;
    }
  }

  return nearest ?? markets[0];
};

export const attachSeriesToMarket = (
  market: PredictMarket,
  series: PredictSeries,
): PredictMarketWithSeries => ({
  ...market,
  series: market.series ?? series,
});

export const resolvePredictSeriesMarket = (
  sourceMarket: PredictMarketWithSeries,
  seriesMarkets?: PredictMarket[],
): PredictMarketWithSeries => {
  if (!seriesMarkets?.length) {
    return sourceMarket;
  }

  return attachSeriesToMarket(
    findLiveMarket(seriesMarkets) ??
      findNearestMarket(seriesMarkets) ??
      sourceMarket,
    sourceMarket.series,
  );
};

export const resolvePredictMarketFromSeries = (
  seriesMarkets?: PredictMarket[],
  fallbackSeries?: PredictSeries,
): PredictMarket | undefined => {
  if (!seriesMarkets?.length) {
    return undefined;
  }

  const resolvedMarket =
    findLiveMarket(seriesMarkets) ?? findNearestMarket(seriesMarkets);

  if (!resolvedMarket || !fallbackSeries) {
    return resolvedMarket;
  }

  return attachSeriesToMarket(resolvedMarket, fallbackSeries);
};
