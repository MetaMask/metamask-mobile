import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlePeriod,
  TimeDuration,
  type CandleData,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { usePerpsMarketContext } from '../../../../../UI/Perps/hooks/usePerpsMarketContext';
import { usePerpsStream } from '../../../../../UI/Perps/providers/PerpsStreamManager';

const SPARKLINE_TARGET_POINTS = 50;
const SPARKLINE_CANDLE_COUNT = 96; // 24h of 15-minute candles

export interface UseHomepageSparklinesResult {
  refresh: () => Promise<void>;
  sparklines: Record<string, number[]>;
}

type MarketTrend = NonNullable<PerpsMarketData['trend']>;

function downsample(data: number[], targetLength: number): number[] {
  if (data.length <= targetLength) return data;
  const result: number[] = [];
  const step = (data.length - 1) / (targetLength - 1);
  for (let i = 0; i < targetLength; i++) {
    result.push(data[Math.round(i * step)]);
  }
  return result;
}

function extractCloses(trend: MarketTrend | undefined): number[] {
  if (!trend || trend.length === 0) return [];
  return trend
    .map(([, price]) => Number.parseFloat(String(price)))
    .filter((price) => !Number.isNaN(price));
}

function extractCandleCloses(candleData: CandleData): number[] {
  return candleData.candles
    .slice(-SPARKLINE_CANDLE_COUNT)
    .map((candle) => Number.parseFloat(String(candle.close)))
    .filter((price) => !Number.isNaN(price));
}

function retainFallbackSymbols(
  sparklines: Record<string, number[]>,
  symbols: string[],
): Record<string, number[]> {
  return Object.fromEntries(
    symbols.flatMap((symbol) =>
      symbol in sparklines ? [[symbol, sparklines[symbol]]] : [],
    ),
  );
}

/**
 * Builds sparklines from Terminal trend data when present. Markets returned by
 * the direct-provider fallback have no trend, so only those markets retain the
 * candle subscription needed to avoid blank tiles.
 *
 * This avoids a HyperLiquid `candleSnapshot` request per symbol on every
 * reconnect. Hourly trend freshness is sufficient for the Homepage preview.
 *
 * @param marketsOrSymbols - Terminal markets when available, or symbols for
 * existing callers that still require candle data.
 */
export function useHomepageSparklines(
  marketsOrSymbols: PerpsMarketData[] | string[],
): UseHomepageSparklinesResult {
  const safeMarketsOrSymbols = useMemo(
    () => marketsOrSymbols ?? [],
    [marketsOrSymbols],
  );
  const stream = usePerpsStream();
  const { identityKey: marketContextKey } = usePerpsMarketContext();
  const [fallbackState, setFallbackState] = useState<{
    contextKey: string;
    values: Record<string, number[]>;
  }>(() => ({ contextKey: marketContextKey, values: {} }));
  const fallbackDataRef = useRef<Record<string, number[]>>({});
  const fallbackContextKeyRef = useRef(marketContextKey);
  const marketContextKeyRef = useRef(marketContextKey);
  marketContextKeyRef.current = marketContextKey;
  const refreshCountBySymbolRef = useRef(new Map<string, number>());
  const flushScheduledRef = useRef(false);
  const lastSparklinesRef = useRef<{
    contextKey: string;
    values: Record<string, number[]>;
  }>({ contextKey: marketContextKey, values: {} });

  const { fallbackSymbolsKey, trendSparklines } = useMemo(() => {
    const fallbacks: string[] = [];
    const trends: Record<string, number[]> = {};
    for (const marketOrSymbol of safeMarketsOrSymbols) {
      const symbol =
        typeof marketOrSymbol === 'string'
          ? marketOrSymbol
          : marketOrSymbol.symbol;
      if (!symbol) continue;
      const closes = extractCloses(
        typeof marketOrSymbol === 'string' ? undefined : marketOrSymbol.trend,
      );
      if (closes.length < 2) {
        fallbacks.push(symbol);
      } else {
        trends[symbol] = downsample(closes, SPARKLINE_TARGET_POINTS);
      }
    }
    return {
      fallbackSymbolsKey: fallbacks.join(','),
      trendSparklines: trends,
    };
  }, [safeMarketsOrSymbols]);

  useEffect(() => {
    let active = true;
    const fallbackSymbols = fallbackSymbolsKey
      ? fallbackSymbolsKey.split(',').filter(Boolean)
      : [];
    const contextChanged = fallbackContextKeyRef.current !== marketContextKey;
    fallbackContextKeyRef.current = marketContextKey;
    fallbackDataRef.current = contextChanged
      ? {}
      : retainFallbackSymbols(fallbackDataRef.current, fallbackSymbols);
    flushScheduledRef.current = false;
    setFallbackState((current) => {
      const currentValues =
        current.contextKey === marketContextKey ? current.values : {};
      const next = contextChanged
        ? {}
        : retainFallbackSymbols(currentValues, fallbackSymbols);
      const currentSymbols = Object.keys(currentValues);
      return current.contextKey === marketContextKey &&
        currentSymbols.length === Object.keys(next).length &&
        currentSymbols.every((symbol) => currentValues[symbol] === next[symbol])
        ? current
        : { contextKey: marketContextKey, values: next };
    });

    if (fallbackSymbols.length === 0) return undefined;

    const scheduleFlush = () => {
      if (flushScheduledRef.current) return;
      flushScheduledRef.current = true;
      queueMicrotask(() => {
        if (!active) return;
        flushScheduledRef.current = false;
        setFallbackState({
          contextKey: marketContextKey,
          values: { ...fallbackDataRef.current },
        });
      });
    };

    const unsubscribes = fallbackSymbols.map((symbol) =>
      stream.candles.subscribe({
        symbol,
        interval: CandlePeriod.FifteenMinutes,
        duration: TimeDuration.OneDay,
        callback: (candleData: CandleData) => {
          if (!active) return;
          if (!candleData?.candles || candleData.candles.length === 0) {
            return;
          }
          if (
            fallbackDataRef.current[symbol] &&
            (refreshCountBySymbolRef.current.get(
              `${marketContextKey}:${symbol}`,
            ) ?? 0) === 0
          ) {
            return;
          }
          if (candleData.candles.length < 2) return;

          const closes = extractCandleCloses(candleData);
          if (closes.length < 2) return;

          fallbackDataRef.current = {
            ...fallbackDataRef.current,
            [symbol]: downsample(closes, SPARKLINE_TARGET_POINTS),
          };
          scheduleFlush();
        },
      }),
    );

    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [fallbackSymbolsKey, marketContextKey, stream]);

  const sparklines = useMemo(() => {
    const fallbackSparklines =
      fallbackState.contextKey === marketContextKey ? fallbackState.values : {};
    const current = { ...fallbackSparklines, ...trendSparklines };
    const previous =
      lastSparklinesRef.current.contextKey === marketContextKey
        ? lastSparklinesRef.current.values
        : {};
    const next = Object.fromEntries(
      safeMarketsOrSymbols.flatMap((marketOrSymbol) => {
        const symbol =
          typeof marketOrSymbol === 'string'
            ? marketOrSymbol
            : marketOrSymbol.symbol;
        if (!symbol) return [];
        const values = current[symbol] ?? previous[symbol];
        return values ? [[symbol, values]] : [];
      }),
    );
    return next;
  }, [fallbackState, marketContextKey, safeMarketsOrSymbols, trendSparklines]);

  useEffect(() => {
    lastSparklinesRef.current = {
      contextKey: marketContextKey,
      values: sparklines,
    };
  }, [marketContextKey, sparklines]);

  const refresh = useCallback(async () => {
    if (!fallbackSymbolsKey) return;
    const symbols = fallbackSymbolsKey.split(',').filter(Boolean);
    const refreshContextKey = marketContextKeyRef.current;
    symbols.forEach((symbol) => {
      const key = `${refreshContextKey}:${symbol}`;
      refreshCountBySymbolRef.current.set(
        key,
        (refreshCountBySymbolRef.current.get(key) ?? 0) + 1,
      );
    });
    try {
      await Promise.allSettled(
        symbols.map((symbol) =>
          stream.candles.prewarmCandles(
            symbol,
            CandlePeriod.FifteenMinutes,
            TimeDuration.OneDay,
            true,
          ),
        ),
      );
    } finally {
      symbols.forEach((symbol) => {
        const key = `${refreshContextKey}:${symbol}`;
        const count = (refreshCountBySymbolRef.current.get(key) ?? 1) - 1;
        if (count > 0) {
          refreshCountBySymbolRef.current.set(key, count);
        } else {
          refreshCountBySymbolRef.current.delete(key);
        }
      });
    }
  }, [fallbackSymbolsKey, stream]);

  return useMemo(() => ({ refresh, sparklines }), [refresh, sparklines]);
}
