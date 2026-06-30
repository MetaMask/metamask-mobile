import { useEffect, useMemo, useRef, useState } from 'react';
import type { Position } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { isPerpPosition } from '../utils/perp';
import {
  fetchHyperliquidHistoricalPrices,
  resolveHyperliquidCandleLimit,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import { TIME_PERIODS, type TimePeriod } from './traderPositionData.shared';

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

  const [perpCache, setPerpCache] = useState<{
    key: string;
    prices: Partial<Record<TimePeriod, TokenPrice[]>>;
    limits: Partial<Record<TimePeriod, number>>;
  }>({ key: '', prices: {}, limits: {} });
  const [isLoading, setIsLoading] = useState(true);

  const perpCacheRef = useRef(perpCache);
  perpCacheRef.current = perpCache;

  useEffect(() => {
    if (!enabled || !positionParam || !isPerp) return;

    let cancelled = false;
    const nowMs = Date.now();
    const { tokenSymbol: perpSymbol } = positionParam;

    TIME_PERIODS.forEach((period) => {
      const { interval, baseLimit } = PERP_PERIOD_TO_CANDLES[period];
      const limit = resolveHyperliquidCandleLimit({
        interval,
        baseLimit,
        earliestTradeMs,
        nowMs,
      });

      const cached = perpCacheRef.current;
      if (
        cached.key === perpKey &&
        cached.prices[period]?.length &&
        (cached.limits[period] ?? 0) >= limit
      ) {
        return;
      }

      fetchHyperliquidHistoricalPrices({
        symbol: perpSymbol,
        interval,
        limit,
        nowMs,
      }).then((prices) => {
        if (cancelled) return;
        setPerpCache((prev) => {
          const samePos = prev.key === perpKey;
          if (samePos && prev.prices[period]?.length && !prices.length) {
            return prev;
          }
          return {
            key: perpKey,
            prices: samePos
              ? { ...prev.prices, [period]: prices }
              : { [period]: prices },
            limits: samePos
              ? { ...prev.limits, [period]: limit }
              : { [period]: limit },
          };
        });
      });
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
