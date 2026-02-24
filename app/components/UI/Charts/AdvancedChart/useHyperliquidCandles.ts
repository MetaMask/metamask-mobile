import { useCallback, useEffect, useRef, useState } from 'react';
import type { OHLCVBar } from './AdvancedChart.types';

const HL_INFO_URL = 'https://api.hyperliquid.xyz/info';

type HLInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

interface HLCandle {
  t: number; // open time (ms)
  T: number; // close time (ms)
  s: string; // symbol
  i: string; // interval
  o: string; // open
  c: string; // close
  h: string; // high
  l: string; // low
  v: string; // volume
  n: number; // number of trades
}

const INTERVAL_MS: Record<HLInterval, number> = {
  '1m': 60_000,
  '3m': 180_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '2h': 7_200_000,
  '4h': 14_400_000,
  '8h': 28_800_000,
  '12h': 43_200_000,
  '1d': 86_400_000,
  '3d': 259_200_000,
  '1w': 604_800_000,
  '1M': 2_592_000_000,
};

const hlCandleToOHLCV = (candle: HLCandle): OHLCVBar => ({
  time: candle.t,
  open: parseFloat(candle.o),
  high: parseFloat(candle.h),
  low: parseFloat(candle.l),
  close: parseFloat(candle.c),
  volume: parseFloat(candle.v),
});

async function fetchCandles(
  coin: string,
  interval: HLInterval,
  startTime: number,
  endTime: number,
): Promise<OHLCVBar[]> {
  const response = await fetch(HL_INFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: { coin, interval, startTime, endTime },
    }),
  });

  if (!response.ok) {
    throw new Error(`Hyperliquid API error: ${response.status}`);
  }

  const data: HLCandle[] = await response.json();
  return data.map(hlCandleToOHLCV);
}

interface UseHyperliquidCandlesOptions {
  coin: string;
  interval?: HLInterval | string;
  /** Number of candles to fetch initially (default 300) */
  count?: number;
  enabled?: boolean;
}

interface UseHyperliquidCandlesResult {
  ohlcvData: OHLCVBar[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  fetchMoreHistory: () => void;
}

/**
 * Fetches OHLCV candle data from the Hyperliquid REST API.
 *
 * Uses the public `candleSnapshot` endpoint — no auth or websocket needed.
 * Ideal for local testing of the AdvancedChart component with real market data.
 */
export const useHyperliquidCandles = ({
  coin,
  interval = '15m',
  count = 300,
  enabled = true,
}: UseHyperliquidCandlesOptions): UseHyperliquidCandlesResult => {
  const [ohlcvData, setOhlcvData] = useState<OHLCVBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!coin || !enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const endTime = Date.now();
      const candleMs = INTERVAL_MS[interval];
      const startTime = endTime - candleMs * count;

      const bars = await fetchCandles(coin, interval, startTime, endTime);
      if (!controller.signal.aborted) {
        setOhlcvData(bars);
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [coin, interval, count, enabled]);

  const fetchMoreHistory = useCallback(async () => {
    if (ohlcvData.length === 0) return;

    try {
      const oldestTime = ohlcvData[0].time;
      const candleMs = INTERVAL_MS[interval];
      const startTime = oldestTime - candleMs * count;

      const olderBars = await fetchCandles(
        coin,
        interval,
        startTime,
        oldestTime,
      );
      if (olderBars.length > 0) {
        setOhlcvData((prev) => [...olderBars, ...prev]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
    }
  }, [ohlcvData, coin, interval, count]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { ohlcvData, isLoading, error, refetch: load, fetchMoreHistory };
};
