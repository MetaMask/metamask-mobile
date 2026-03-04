import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePerpsStream } from '../../../../../UI/Perps/providers/PerpsStreamManager';
import {
  CandlePeriod,
  TimeDuration,
  type CandleData,
} from '@metamask/perps-controller';

const SPARKLINE_TARGET_POINTS = 50;
const SPARKLINE_CANDLE_COUNT = 96; // 24h of 15-min candles

export interface UseHomepageSparklinesResult {
  sparklines: Record<string, number[]>;
  refresh: () => void;
}

function downsample(data: number[], targetLength: number): number[] {
  if (data.length <= targetLength) return data;
  const result: number[] = [];
  const step = (data.length - 1) / (targetLength - 1);
  for (let i = 0; i < targetLength; i++) {
    result.push(data[Math.round(i * step)]);
  }
  return result;
}

function extractCloses(candleData: CandleData): number[] {
  const candles = candleData.candles.slice(-SPARKLINE_CANDLE_COUNT);
  return candles.map((c) => parseFloat(String(c.close)));
}

/**
 * Subscribe to candle data for the given symbols via the WebSocket stream
 * and return downsampled close prices suitable for sparkline rendering.
 *
 * Uses the existing CandleStreamChannel which handles caching, ref-counting,
 * and reconnection automatically.
 *
 * Candle callbacks arrive independently per symbol. A microtask-based flush
 * coalesces rapid-fire arrivals into a single React state update so the
 * parent component re-renders once instead of N times (one per symbol).
 *
 * @param symbols - Market symbols to fetch sparklines for
 */
export function useHomepageSparklines(
  symbols: string[],
): UseHomepageSparklinesResult {
  const stream = usePerpsStream();
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const dataRef = useRef<Record<string, number[]>>({});
  const flushScheduledRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stable string key so the effect doesn't re-run on every render
  // when the caller produces a new array reference with the same contents.
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  useEffect(() => {
    if (!symbolsKey) return undefined;

    dataRef.current = {};
    flushScheduledRef.current = false;
    setSparklines({});

    const scheduleFlush = () => {
      if (flushScheduledRef.current) return;
      flushScheduledRef.current = true;
      queueMicrotask(() => {
        flushScheduledRef.current = false;
        setSparklines({ ...dataRef.current });
      });
    };

    const unsubscribes: (() => void)[] = [];

    for (const symbol of symbols) {
      const unsubscribe = stream.candles.subscribe({
        symbol,
        interval: CandlePeriod.FifteenMinutes,
        duration: TimeDuration.OneDay,
        callback: (candleData: CandleData) => {
          if (dataRef.current[symbol]) return;
          if (!candleData || candleData.candles.length < 2) return;

          const closes = extractCloses(candleData);
          if (closes.length < 2) return;

          dataRef.current = {
            ...dataRef.current,
            [symbol]: downsample(closes, SPARKLINE_TARGET_POINTS),
          };
          scheduleFlush();
        },
      });
      unsubscribes.push(unsubscribe);
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- symbolsKey is the stable representation of symbols
  }, [stream, symbolsKey, refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { sparklines, refresh };
}
