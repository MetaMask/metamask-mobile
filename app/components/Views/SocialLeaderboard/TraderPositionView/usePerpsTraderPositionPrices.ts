import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { Position } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { isPerpPosition } from '../utils/perp';
import {
  fetchHyperliquidHistoricalPrices,
  resolveHyperliquidCandleLimit,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import { TIME_PERIODS, type TimePeriod } from './traderPositionData';

/**
 * Hyperliquid candle interval + baseline candle count per chart period. The base
 * count fills the period's default window when a position has no (or only recent)
 * trades; for older / closed positions {@link resolveHyperliquidCandleLimit} grows
 * it to reach the earliest trade, capped at the API's per-request maximum
 * (~5000 candles). Counts stay well above CHART_DATA_THRESHOLD so the line stays
 * smooth. Unlike the spot API, each period maps to a distinct interval
 * (granularity), so there's no 1D→1H reuse.
 */
const PERP_PERIOD_TO_CANDLES: Record<
  TimePeriod,
  { interval: HyperliquidCandleInterval; baseLimit: number }
> = {
  '1H': { interval: '1m', baseLimit: 60 },
  '1D': { interval: '15m', baseLimit: 96 },
  '1W': { interval: '1h', baseLimit: 168 },
  '1M': { interval: '4h', baseLimit: 180 },
  All: { interval: '1d', baseLimit: 1095 },
};

interface PerpCacheState {
  key: string;
  prices: Partial<Record<TimePeriod, TokenPrice[]>>;
  limits: Partial<Record<TimePeriod, number>>;
}

function mergePerpPeriodIntoCache(
  prev: PerpCacheState,
  perpKey: string,
  period: TimePeriod,
  prices: TokenPrice[],
  limit: number,
): PerpCacheState {
  const samePos = prev.key === perpKey;
  if (samePos && prev.prices[period]?.length && !prices.length) {
    return prev;
  }
  return {
    key: perpKey,
    prices: samePos
      ? { ...prev.prices, [period]: prices }
      : { [period]: prices },
    limits: samePos ? { ...prev.limits, [period]: limit } : { [period]: limit },
  };
}

function isPerpPeriodCached(
  cached: PerpCacheState,
  perpKey: string,
  period: TimePeriod,
  limit: number,
): boolean {
  return (
    cached.key === perpKey &&
    Boolean(cached.prices[period]?.length) &&
    (cached.limits[period] ?? 0) >= limit
  );
}

async function fetchPerpPeriodCandles({
  period,
  perpSymbol,
  perpKey,
  earliestTradeMs,
  nowMs,
  cached,
}: {
  period: TimePeriod;
  perpSymbol: string;
  perpKey: string;
  earliestTradeMs: number | undefined;
  nowMs: number;
  cached: PerpCacheState;
}): Promise<{
  period: TimePeriod;
  prices: TokenPrice[];
  limit: number;
} | null> {
  const { interval, baseLimit } = PERP_PERIOD_TO_CANDLES[period];
  const limit = resolveHyperliquidCandleLimit({
    interval,
    baseLimit,
    earliestTradeMs,
    nowMs,
  });

  if (isPerpPeriodCached(cached, perpKey, period, limit)) {
    return null;
  }

  const prices = await fetchHyperliquidHistoricalPrices({
    symbol: perpSymbol,
    interval,
    limit,
    nowMs,
  });

  return { period, prices, limit };
}

function applyPerpPeriodFetchResult(
  setPerpCache: Dispatch<SetStateAction<PerpCacheState>>,
  perpKey: string,
  result: { period: TimePeriod; prices: TokenPrice[]; limit: number },
) {
  setPerpCache((prev) =>
    mergePerpPeriodIntoCache(
      prev,
      perpKey,
      result.period,
      result.prices,
      result.limit,
    ),
  );
}

/** Fires every period at once so the active interval can resolve without waiting on earlier ones. */
function prefetchPerpPeriodsInParallel({
  perpSymbol,
  perpKey,
  earliestTradeMs,
  nowMs,
  getCached,
  setPerpCache,
  isCancelled,
}: {
  perpSymbol: string;
  perpKey: string;
  earliestTradeMs: number | undefined;
  nowMs: number;
  getCached: () => PerpCacheState;
  setPerpCache: Dispatch<SetStateAction<PerpCacheState>>;
  isCancelled: () => boolean;
}) {
  for (const period of TIME_PERIODS) {
    fetchPerpPeriodCandles({
      period,
      perpSymbol,
      perpKey,
      earliestTradeMs,
      nowMs,
      cached: getCached(),
    }).then((result) => {
      if (isCancelled() || !result) return;
      applyPerpPeriodFetchResult(setPerpCache, perpKey, result);
    });
  }
}

export interface PerpsTraderPositionPricesParams {
  positionParam: Position | undefined;
  activeTimePeriod: TimePeriod;
  earliestTradeMs: number | undefined;
}

export interface PerpsTraderPositionPricesOptions {
  enabled: boolean;
}

export interface PerpsTraderPositionPricesResult {
  pricesByPeriod: Partial<Record<TimePeriod, TokenPrice[]>>;
  isLoading: boolean;
  perpKey: string;
}

export function usePerpsTraderPositionPrices(
  {
    positionParam,
    activeTimePeriod,
    earliestTradeMs,
  }: PerpsTraderPositionPricesParams,
  { enabled }: PerpsTraderPositionPricesOptions,
): PerpsTraderPositionPricesResult {
  const isPerp =
    enabled && positionParam != null && isPerpPosition(positionParam);

  const perpKey = useMemo(
    () =>
      isPerp && positionParam
        ? `${positionParam.chain}:${positionParam.tokenSymbol}`
        : '',
    [isPerp, positionParam],
  );

  const [perpCache, setPerpCache] = useState<PerpCacheState>({
    key: '',
    prices: {},
    limits: {},
  });
  const [isLoading, setIsLoading] = useState(true);

  const perpCacheRef = useRef(perpCache);
  perpCacheRef.current = perpCache;

  useEffect(() => {
    if (!enabled || !positionParam || !isPerp) return;

    let cancelled = false;
    const nowMs = Date.now();
    const { tokenSymbol: perpSymbol } = positionParam;

    prefetchPerpPeriodsInParallel({
      perpSymbol,
      perpKey,
      earliestTradeMs,
      nowMs,
      getCached: () => perpCacheRef.current,
      setPerpCache,
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, positionParam, isPerp, perpKey, earliestTradeMs]);

  useEffect(() => {
    if (!enabled || !isPerp) return;
    const hasActivePeriod =
      perpCache.key === perpKey && Boolean(perpCache.prices[activeTimePeriod]);
    setIsLoading(!hasActivePeriod);
  }, [enabled, isPerp, perpKey, activeTimePeriod, perpCache]);

  const pricesByPeriod = useMemo(
    () => (perpCache.key === perpKey ? perpCache.prices : {}),
    [perpCache, perpKey],
  );

  return {
    pricesByPeriod: enabled ? pricesByPeriod : {},
    isLoading: enabled ? isLoading : false,
    perpKey,
  };
}
