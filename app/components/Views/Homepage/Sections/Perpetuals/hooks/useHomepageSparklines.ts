import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlePeriod,
  TimeDuration,
  type CandleData,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { usePerpsStream } from '../../../../../UI/Perps/providers/PerpsStreamManager';
import { SPARKLINE_CANDLE_COUNT, SPARKLINE_TARGET_POINTS } from '../constants';

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
 * Build downsampled close-price arrays from Terminal trend data when present.
 * Markets returned by the direct-provider fallback have no trend, so only
 * those markets retain the candle subscription needed to avoid blank tiles.
 *
 * Previously this subscribed to a per-symbol candle stream, which fired a
 * HyperLiquid `candleSnapshot` call per symbol on every reconnect. Reading
 * `trend` instead avoids that, at the cost of hourly (not live) freshness —
 * fine for the small homepage preview.
 *
 * @param markets - Markets to build sparklines for.
 */
export function useHomepageSparklines(
  markets: PerpsMarketData[],
): UseHomepageSparklinesResult {
  const safeMarkets = useMemo(() => markets ?? [], [markets]);
  const stream = usePerpsStream();
  const [fallbackSparklines, setFallbackSparklines] = useState<
    Record<string, number[]>
  >({});
  const fallbackDataRef = useRef<Record<string, number[]>>({});
  const refreshCountBySymbolRef = useRef(new Map<string, number>());
  const flushScheduledRef = useRef(false);
  const lastSparklinesRef = useRef<Record<string, number[]>>({});

  const { fallbackSymbolsKey, trendSparklines } = useMemo(() => {
    const fallbacks: string[] = [];
    const trends: Record<string, number[]> = {};
    for (const market of safeMarkets) {
      const closes = extractCloses(market.trend);
      if (closes.length < 2) {
        fallbacks.push(market.symbol);
      } else {
        trends[market.symbol] = downsample(closes, SPARKLINE_TARGET_POINTS);
      }
    }
    return {
      fallbackSymbolsKey: fallbacks.join(','),
      trendSparklines: trends,
    };
  }, [safeMarkets]);

  useEffect(() => {
    let active = true;
    const fallbackSymbols = fallbackSymbolsKey
      ? fallbackSymbolsKey.split(',')
      : [];
    fallbackDataRef.current = retainFallbackSymbols(
      fallbackDataRef.current,
      fallbackSymbols,
    );
    flushScheduledRef.current = false;
    setFallbackSparklines((current) => {
      const next = retainFallbackSymbols(current, fallbackSymbols);
      const currentSymbols = Object.keys(current);
      return currentSymbols.length === Object.keys(next).length &&
        currentSymbols.every((symbol) => current[symbol] === next[symbol])
        ? current
        : next;
    });

    if (fallbackSymbols.length === 0) return undefined;

    const scheduleFlush = () => {
      if (flushScheduledRef.current) return;
      flushScheduledRef.current = true;
      queueMicrotask(() => {
        if (!active) return;
        flushScheduledRef.current = false;
        setFallbackSparklines({ ...fallbackDataRef.current });
      });
    };

    const unsubscribes = fallbackSymbols.map((symbol) =>
      stream.candles.subscribe({
        symbol,
        interval: CandlePeriod.FifteenMinutes,
        duration: TimeDuration.OneDay,
        callback: (candleData: CandleData) => {
          if (!candleData?.candles || candleData.candles.length === 0) {
            return;
          }
          if (
            fallbackDataRef.current[symbol] &&
            (refreshCountBySymbolRef.current.get(symbol) ?? 0) === 0
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
  }, [fallbackSymbolsKey, stream]);

  const sparklines = useMemo(() => {
    const current = { ...fallbackSparklines, ...trendSparklines };
    const next = Object.fromEntries(
      safeMarkets.flatMap(({ symbol }) => {
        const values = current[symbol] ?? lastSparklinesRef.current[symbol];
        return values ? [[symbol, values]] : [];
      }),
    );
    lastSparklinesRef.current = next;
    return next;
  }, [fallbackSparklines, safeMarkets, trendSparklines]);

  const refresh = useCallback(async () => {
    if (!fallbackSymbolsKey) return;
    const symbols = fallbackSymbolsKey.split(',');
    symbols.forEach((symbol) =>
      refreshCountBySymbolRef.current.set(
        symbol,
        (refreshCountBySymbolRef.current.get(symbol) ?? 0) + 1,
      ),
    );
    try {
      await Promise.all(
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
        const count = (refreshCountBySymbolRef.current.get(symbol) ?? 1) - 1;
        if (count > 0) {
          refreshCountBySymbolRef.current.set(symbol, count);
        } else {
          refreshCountBySymbolRef.current.delete(symbol);
        }
      });
    }
  }, [fallbackSymbolsKey, stream]);

  return useMemo(() => ({ refresh, sparklines }), [refresh, sparklines]);
}
