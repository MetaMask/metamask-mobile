import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { tradeTimestampToMs } from '../../../UI/SocialFeed/utils/tradeTimestamp';
import {
  fetchHyperliquidHistoricalPrices,
  resolveHyperliquidCandleLimit,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import type { SocialOgImageRequest } from './socialOgImageService';

/** The API accepts at most 200 points per series. */
export const MAX_OG_SERIES_POINTS = 200;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
/** Upper bound on candles fetched for a perp card before downsampling. */
const MAX_PERP_OG_CANDLES = 1000;
const PERP_OG_INTERVALS: readonly HyperliquidCandleInterval[] = [
  '1m',
  '15m',
  '1h',
  '4h',
  '1d',
];

/** The API rejects `http:` and SVG; anything that is not `https:` is left out. */
const toHttpsUrl = (value: string | null | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    return new URL(value).protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
};

const toOgHandle = (
  username: string | null | undefined,
): string | undefined => {
  const trimmed = username?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Keeps the first and last point and evenly spaced points between them. */
export const downsampleSeries = <T>(
  points: readonly T[],
  maxPoints: number = MAX_OG_SERIES_POINTS,
): T[] => {
  if (points.length <= maxPoints) {
    return [...points];
  }
  const step = (points.length - 1) / (maxPoints - 1);
  return Array.from(
    { length: maxPoints },
    (_, index) => points[Math.round(index * step)],
  );
};

const nearestIndex = (
  points: readonly TokenPrice[],
  timeMs: number,
): number => {
  let bestIndex = 0;
  let bestDistance = Infinity;
  points.forEach(([timestamp], index) => {
    const distance = Math.abs(Number(timestamp) - timeMs);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
};

const averageFillPrice = (
  trades: Position['trades'],
  intent: 'enter' | 'exit',
): number | undefined => {
  let usd = 0;
  let amount = 0;
  for (const trade of trades) {
    if (trade.intent !== intent || !isFiniteNumber(trade.tokenAmount)) {
      continue;
    }
    usd += Math.abs(trade.usdCost);
    amount += Math.abs(trade.tokenAmount);
  }
  return amount > 0 && usd > 0 ? usd / amount : undefined;
};

const tradeTimesMs = (
  trades: Position['trades'],
  intent: 'enter' | 'exit',
): number[] =>
  trades
    .filter((trade) => trade.intent === intent)
    .map((trade) => tradeTimestampToMs(trade.timestamp))
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);

/** Earliest fill in milliseconds, or `undefined` when there are no trades. */
export const getEarliestTradeMs = (
  trades: Position['trades'],
): number | undefined => {
  const times = trades
    .map((trade) => tradeTimestampToMs(trade.timestamp))
    .filter((timestamp) => Number.isFinite(timestamp) && timestamp > 0);
  return times.length ? Math.min(...times) : undefined;
};

/**
 * Close prices for a perp card, from the earliest fill to now. Picks the
 * finest candle interval that covers that span within
 * {@link MAX_PERP_OG_CANDLES}. Returns `[]` when Hyperliquid fails.
 */
export const fetchPerpOgSeries = async (
  symbol: string,
  earliestTradeMs: number | undefined,
  nowMs: number,
): Promise<TokenPrice[]> => {
  for (const interval of PERP_OG_INTERVALS) {
    const limit = resolveHyperliquidCandleLimit({
      interval,
      baseLimit: 24,
      earliestTradeMs,
      nowMs,
    });
    if (
      limit <= MAX_PERP_OG_CANDLES ||
      interval === PERP_OG_INTERVALS[PERP_OG_INTERVALS.length - 1]
    ) {
      return fetchHyperliquidHistoricalPrices({
        symbol,
        interval,
        limit: Math.min(limit, MAX_PERP_OG_CANDLES),
        nowMs,
      });
    }
  }
  return [];
};

export interface SocialTradeOgCardInput {
  traderId: string;
  positionId: string;
  /** Username, with or without a leading `@`. */
  username: string | null | undefined;
  avatarUrl?: string | null;
  position: Position;
  /** Display symbol, for example `BTC` rather than `xyz:BTC`. */
  market: string;
  marketIconUrl?: string | null;
  isPerp: boolean;
  isClosed: boolean;
  pnlUsd: number | null | undefined;
  pnlPct: number | null | undefined;
  /** Latest price for an open position. Falls back to the last series point. */
  markPrice?: number | null;
  /** `[timestamp, price]`, oldest first. */
  prices: readonly TokenPrice[];
}

/**
 * Trade A body. Returns `undefined` when a required field is missing, so the
 * caller can use the generic card instead. A perp with no known side is left
 * out rather than guessed. Spot positions are drawn as a long.
 */
export const buildSocialTradeOgImageRequest = (
  input: SocialTradeOgCardInput,
): SocialOgImageRequest | undefined => {
  const handle = toOgHandle(input.username);
  const market = input.market.trim();
  const perpSide = input.position.perpPositionType ?? null;
  if (
    !handle ||
    !market ||
    !isFiniteNumber(input.pnlUsd) ||
    !isFiniteNumber(input.pnlPct) ||
    (input.isPerp && perpSide == null)
  ) {
    return undefined;
  }

  const entryPrice = averageFillPrice(input.position.trades, 'enter');
  const points = downsampleSeries(
    input.prices.filter(
      ([timestamp, price]) =>
        Number.isFinite(Number(timestamp)) &&
        isFiniteNumber(price) &&
        price > 0,
    ),
  );
  if (!entryPrice || points.length < 2) {
    return undefined;
  }

  const series = points.map(([, price]) => price);
  const entryTimes = tradeTimesMs(input.position.trades, 'enter');
  const exitTimes = tradeTimesMs(input.position.trades, 'exit');
  const leverage = input.position.perpLeverage;
  const exitPrice = input.isClosed
    ? averageFillPrice(input.position.trades, 'exit')
    : undefined;
  const markPrice = input.isClosed
    ? undefined
    : isFiniteNumber(input.markPrice) && input.markPrice > 0
      ? input.markPrice
      : series[series.length - 1];
  const closedAt = input.isClosed
    ? tradeTimestampToMs(input.position.lastTradeAt)
    : undefined;

  return {
    kind: 'trade',
    traderId: input.traderId,
    positionId: input.positionId,
    trade: {
      handle,
      avatarUrl: toHttpsUrl(input.avatarUrl),
      market,
      marketIconUrl: toHttpsUrl(input.marketIconUrl),
      side: perpSide === 'short' ? 'Short' : 'Long',
      leverage:
        input.isPerp && isFiniteNumber(leverage) && leverage >= 1
          ? Math.min(leverage, 1000)
          : undefined,
      status: input.isClosed ? 'closed' : 'open',
      closedAt: isFiniteNumber(closedAt) && closedAt > 0 ? closedAt : undefined,
      pnlUsd: input.pnlUsd,
      pnlPct: input.pnlPct,
      entryPrice,
      exitPrice,
      markPrice,
      series,
      entryIndex: entryTimes.length
        ? nearestIndex(points, Math.min(...entryTimes))
        : undefined,
      exitIndex:
        input.isClosed && exitTimes.length
          ? nearestIndex(points, Math.max(...exitTimes))
          : undefined,
      showDollar: true,
    },
  };
};

export interface SocialProfileOgCardInput {
  traderId: string;
  username: string | null | undefined;
  avatarUrl?: string | null;
  profile: TraderProfileResponse | null | undefined;
  closedPositions: readonly Position[];
  nowMs: number;
}

interface ClosedPnl {
  closedAtMs: number;
  realizedPnl: number;
}

/** Loaded closed positions with a realized PnL, closed in the last 30 days, oldest first. */
const closedInLast30Days = (
  closedPositions: readonly Position[],
  nowMs: number,
): ClosedPnl[] => {
  const windowStart = nowMs - THIRTY_DAYS_MS;
  return closedPositions
    .map((position) => ({
      closedAtMs: tradeTimestampToMs(position.lastTradeAt),
      realizedPnl: position.realizedPnl,
    }))
    .filter(
      (entry): entry is ClosedPnl =>
        isFiniteNumber(entry.realizedPnl) && entry.closedAtMs >= windowStart,
    )
    .sort((left, right) => left.closedAtMs - right.closedAtMs);
};

/**
 * Cumulative realized PnL, starting at 0. The profile API has no PnL
 * history, so this stands in for one. With nothing closed in the window it is
 * a straight line from 0 to the 30-day PnL.
 */
const buildProfilePnlSeries = (
  recent: readonly ClosedPnl[],
  pnl30dUsd: number,
): number[] => {
  if (!recent.length) {
    return [0, pnl30dUsd];
  }
  let running = 0;
  const series = [0];
  for (const entry of recent) {
    running += entry.realizedPnl;
    series.push(running);
  }
  return downsampleSeries(series);
};

/**
 * Profile A body. Returns `undefined` when there is no handle or no 30-day
 * PnL. The account address is never sent: Social profiles keep it private.
 * `bestTradeUsd` and `pnlSeries` come from loaded positions closed in the
 * last 30 days, to match the card's other 30-day figures.
 */
export const buildSocialProfileOgImageRequest = (
  input: SocialProfileOgCardInput,
): SocialOgImageRequest | undefined => {
  const handle = toOgHandle(input.username);
  const stats = input.profile?.stats;
  const pnl30dUsd = stats?.pnl30d;
  if (!handle || !input.profile || !isFiniteNumber(pnl30dUsd)) {
    return undefined;
  }

  const recent = closedInLast30Days(input.closedPositions, input.nowMs);
  const winRate = stats?.winRate30d;
  const tradeCount = stats?.tradeCount30d;

  return {
    kind: 'profile',
    traderId: input.traderId,
    profile: {
      handle,
      avatarUrl: toHttpsUrl(input.avatarUrl),
      pnl30dUsd,
      winRatePct: isFiniteNumber(winRate)
        ? Math.min(100, Math.max(0, winRate * 100))
        : 0,
      tradeCount: isFiniteNumber(tradeCount) ? tradeCount : 0,
      bestTradeUsd: recent.length
        ? Math.max(...recent.map((entry) => entry.realizedPnl))
        : 0,
      followers: input.profile.followerCount,
      pnlSeries: buildProfilePnlSeries(recent, pnl30dUsd),
    },
  };
};
