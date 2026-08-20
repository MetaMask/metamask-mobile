import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlePeriod,
  TimeDuration,
  type CandleData,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { usePerpsStream } from '../../../../../UI/Perps/providers/PerpsStreamManager';

const SPARKLINE_TARGET_POINTS = 50;
const SPARKLINE_CANDLE_COUNT = 96;

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
  const flushScheduledRef = useRef(false);

  const trendSparklines = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const market of safeMarkets) {
      const closes = extractCloses(market.trend);
      if (closes.length < 2) continue;
      result[market.symbol] = downsample(closes, SPARKLINE_TARGET_POINTS);
    }
    return result;
  }, [safeMarkets]);

  const fallbackSymbolsKey = useMemo(
    () =>
      safeMarkets
        .filter((market) => extractCloses(market.trend).length < 2)
        .map((market) => market.symbol)
        .join(','),
    [safeMarkets],
  );

  useEffect(() => {
    let active = true;
    fallbackDataRef.current = {};
    flushScheduledRef.current = false;
    setFallbackSparklines((current) =>
      Object.keys(current).length === 0 ? current : {},
    );

    if (!fallbackSymbolsKey) return undefined;

    const scheduleFlush = () => {
      if (flushScheduledRef.current) return;
      flushScheduledRef.current = true;
      queueMicrotask(() => {
        if (!active) return;
        flushScheduledRef.current = false;
        setFallbackSparklines({ ...fallbackDataRef.current });
      });
    };

    const unsubscribes = fallbackSymbolsKey.split(',').map((symbol) =>
      stream.candles.subscribe({
        symbol,
        interval: CandlePeriod.FifteenMinutes,
        duration: TimeDuration.OneDay,
        callback: (candleData: CandleData) => {
          if (!candleData?.candles || candleData.candles.length === 0) {
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

  const sparklines = useMemo(
    () => ({ ...fallbackSparklines, ...trendSparklines }),
    [fallbackSparklines, trendSparklines],
  );

  const refresh = useCallback(async () => {
    if (!fallbackSymbolsKey) return;
    await Promise.all(
      fallbackSymbolsKey
        .split(',')
        .map((symbol) =>
          stream.candles.prewarmCandles(
            symbol,
            CandlePeriod.FifteenMinutes,
            TimeDuration.OneDay,
            true,
          ),
        ),
    );
  }, [fallbackSymbolsKey, stream]);

  return useMemo(() => ({ refresh, sparklines }), [refresh, sparklines]);
}
