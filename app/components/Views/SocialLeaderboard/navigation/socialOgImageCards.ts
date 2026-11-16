import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { hasRealAvatar } from '../../../UI/SocialFeed/utils/avatarFallback';
import { parseMoneyReferralCode } from '../../../UI/Rewards/utils/moneyReferralCode';
import { tradeTimestampToMs } from '../../../UI/SocialFeed/utils/tradeTimestamp';
import {
  isFoxiconAvatarUrl,
  parseFoxiconAvatarUrl,
  toFoxiconAvatarUrl,
} from '../MyProfileView/avatarPresets';
import {
  fetchHyperliquidHistoricalPrices,
  resolveHyperliquidCandleLimit,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import type { SocialOgImageRequest } from './socialOgImageService';
import { logSocialOgShare } from './socialOgShareLog';

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

/**
 * The avatar as the og-image API takes it: a `foxicon://` preset with its
 * current ids (legacy ids translated), or an `https:` image that is not a
 * shared placeholder. Anything else is left out and the card shows the
 * handle alone.
 */
export const toOgAvatarUrl = (
  avatarUrl: string | null | undefined,
): string | undefined => {
  const foxicon = parseFoxiconAvatarUrl(avatarUrl);
  if (foxicon) {
    return toFoxiconAvatarUrl(
      foxicon.avatarPresetId,
      foxicon.avatarBackgroundId,
    );
  }
  if (isFoxiconAvatarUrl(avatarUrl) || !hasRealAvatar(avatarUrl)) {
    return undefined;
  }
  return toHttpsUrl(avatarUrl);
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

/** A well-formed referral code, or `undefined` so the card draws no chip. */
const toOgPromoCode = (promoCode: string | undefined): string | undefined =>
  parseMoneyReferralCode(promoCode) ?? undefined;

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
      const cappedLimit = Math.min(limit, MAX_PERP_OG_CANDLES);
      logSocialOgShare('Fetching perp candles for the card', {
        symbol,
        interval,
        limit: cappedLimit,
        earliestTradeMs,
      });
      const prices = await fetchHyperliquidHistoricalPrices({
        symbol,
        interval,
        limit: cappedLimit,
        nowMs,
      });
      logSocialOgShare('Perp candles fetched', {
        symbol,
        points: prices.length,
      });
      return prices;
    }
  }
  return [];
};

export interface SocialTradeOgCardInput {
  traderId: string;
  positionId: string;
  /** Username, with or without a leading `@`. */
  username: string | null | undefined;
  /** Profile image URL or `foxicon://` preset; see {@link toOgAvatarUrl}. */
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
  /** The sharer's referral code, drawn as the card's "Code" chip. */
  promoCode?: string;
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
  const entryPrice = averageFillPrice(input.position.trades, 'enter');
  const points = downsampleSeries(
    input.prices.filter(
      ([timestamp, price]) =>
        Number.isFinite(Number(timestamp)) &&
        isFiniteNumber(price) &&
        price > 0,
    ),
  );
  const missing = [
    !handle && 'handle',
    !market && 'market',
    !isFiniteNumber(input.pnlUsd) && 'pnlUsd',
    !isFiniteNumber(input.pnlPct) && 'pnlPct',
    input.isPerp && perpSide == null && 'perp side',
    !entryPrice && 'entryPrice',
    points.length < 2 && 'series (needs 2+ prices)',
  ].filter(Boolean);
  if (missing.length) {
    logSocialOgShare('Trade card skipped', {
      missing,
      positionId: input.positionId,
      isPerp: input.isPerp,
      rawPricePoints: input.prices.length,
      usablePricePoints: points.length,
    });
    return undefined;
  }
  if (
    !handle ||
    !entryPrice ||
    !isFiniteNumber(input.pnlUsd) ||
    !isFiniteNumber(input.pnlPct)
  ) {
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
      avatarUrl: toOgAvatarUrl(input.avatarUrl),
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
      promoCode: toOgPromoCode(input.promoCode),
    },
  };
};

export interface SocialProfileOgCardInput {
  traderId: string;
  username: string | null | undefined;
  /** Profile image URL or `foxicon://` preset; see {@link toOgAvatarUrl}. */
  avatarUrl?: string | null;
  profile: TraderProfileResponse | null | undefined;
  closedPositions: readonly Position[];
  nowMs: number;
  /** The sharer's referral code, drawn as the card's "Code" chip. */
  promoCode?: string;
}

/** Realized PnLs from loaded positions closed in the last 30 days. */
const realizedPnlsInLast30Days = (
  closedPositions: readonly Position[],
  nowMs: number,
): number[] => {
  const windowStart = nowMs - THIRTY_DAYS_MS;
  return closedPositions
    .map((position) => ({
      closedAtMs: tradeTimestampToMs(position.lastTradeAt),
      realizedPnl: position.realizedPnl,
    }))
    .filter(
      (entry): entry is { closedAtMs: number; realizedPnl: number } =>
        isFiniteNumber(entry.realizedPnl) && entry.closedAtMs >= windowStart,
    )
    .map((entry) => entry.realizedPnl);
};

/**
 * Profile A body. Returns `undefined` when there is no handle or the profile
 * has not loaded. A trader with no 30-day data gets the card with "—" for the
 * PnL. The account address is never sent: Social profiles keep it private.
 * `bestTradeUsd` comes from loaded positions closed in the last 30 days, to
 * match the card's other 30-day figures. The card draws no PnL chart: there
 * is no PnL history for a profile.
 */
export const buildSocialProfileOgImageRequest = (
  input: SocialProfileOgCardInput,
): SocialOgImageRequest | undefined => {
  const handle = toOgHandle(input.username);
  const stats = input.profile?.stats;
  const pnl30dUsd = stats?.pnl30d;
  if (!handle || !input.profile) {
    logSocialOgShare('Profile card skipped', {
      missing: [
        !handle && 'handle',
        !input.profile && 'profile (not loaded)',
      ].filter(Boolean),
      traderId: input.traderId,
    });
    return undefined;
  }

  const recentPnls = realizedPnlsInLast30Days(
    input.closedPositions,
    input.nowMs,
  );
  logSocialOgShare('Profile card derived values', {
    closedPositionsLoaded: input.closedPositions.length,
    closedInLast30Days: recentPnls.length,
  });
  const winRate = stats?.winRate30d;
  const tradeCount = stats?.tradeCount30d;

  return {
    kind: 'profile',
    traderId: input.traderId,
    profile: {
      handle,
      avatarUrl: toOgAvatarUrl(input.avatarUrl),
      // Null when the trader has no 30-day data; the card draws "—".
      pnl30dUsd: isFiniteNumber(pnl30dUsd) ? pnl30dUsd : undefined,
      winRatePct: isFiniteNumber(winRate)
        ? Math.min(100, Math.max(0, winRate * 100))
        : 0,
      tradeCount: isFiniteNumber(tradeCount) ? tradeCount : 0,
      bestTradeUsd: recentPnls.length ? Math.max(...recentPnls) : 0,
      followers: input.profile.followerCount,
      promoCode: toOgPromoCode(input.promoCode),
    },
  };
};
