import { useCallback, useEffect, useRef, useState } from 'react';
import type { OHLCVBar } from './AdvancedChart.types';
import type { OHLCVTimePeriod } from './TimeRangeSelector';

const OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';

interface OHLCVApiCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface OHLCVApiResponse {
  data: OHLCVApiCandle[];
  hasNext: boolean;
  nextCursor: string;
}

export interface UseOHLCVChartOptions {
  /** CAIP asset ID, e.g. "eip155:1/slip44:60" */
  assetId: string;
  timePeriod: OHLCVTimePeriod;
  /** Optional interval override (e.g. '1m' for 1-minute candles instead of API default) */
  interval?: string;
  vsCurrency?: string;
  enabled?: boolean;
}

export interface UseOHLCVChartResult {
  ohlcvData: OHLCVBar[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchMoreHistory: (params: { oldestTimestamp: number }) => void;
}

const mapCandle = (candle: OHLCVApiCandle): OHLCVBar => ({
  time: candle.timestamp,
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
  volume: candle.volume,
});

async function fetchOHLCV(
  assetId: string,
  params: {
    timePeriod?: OHLCVTimePeriod;
    interval?: string;
    nextCursor?: string;
    vsCurrency?: string;
  },
  signal?: AbortSignal,
): Promise<OHLCVApiResponse> {
  const url = new URL(`${OHLCV_BASE_URL}/${assetId}`);

  if (params.nextCursor) {
    url.searchParams.set('nextCursor', params.nextCursor);
  } else if (params.timePeriod) {
    url.searchParams.set('timePeriod', params.timePeriod);
  }

  if (params.interval) {
    url.searchParams.set('interval', params.interval);
  }

  if (params.vsCurrency) {
    url.searchParams.set('vsCurrency', params.vsCurrency);
  }

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(`OHLCV API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches OHLCV chart data from the MetaMask Price API.
 *
 * Supports initial load via `timePeriod` and scroll-back pagination
 * via opaque `nextCursor` tokens returned by the API.
 */
export const useOHLCVChart = ({
  assetId,
  timePeriod,
  interval,
  vsCurrency,
  enabled = true,
}: UseOHLCVChartOptions): UseOHLCVChartResult => {
  const [ohlcvData, setOhlcvData] = useState<OHLCVBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFetchingMoreRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadInitial = useCallback(async () => {
    if (!assetId || !enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    cursorRef.current = null;
    setHasMore(false);

    try {
      const result = await fetchOHLCV(
        assetId,
        { timePeriod, interval, vsCurrency },
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setOhlcvData(result.data.map(mapCandle));
        cursorRef.current = result.nextCursor || null;
        setHasMore(result.hasNext);
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [assetId, timePeriod, interval, vsCurrency, enabled]);

  const fetchMoreHistory = useCallback(
    async (_params: { oldestTimestamp: number }) => {
      if (!cursorRef.current || !hasMore || isFetchingMoreRef.current) return;

      isFetchingMoreRef.current = true;

      try {
        const result = await fetchOHLCV(assetId, {
          nextCursor: cursorRef.current,
          vsCurrency,
        });

        const olderBars = result.data.map(mapCandle);
        if (olderBars.length > 0) {
          setOhlcvData((prev) => [...olderBars, ...prev]);
        }
        cursorRef.current = result.nextCursor || null;
        setHasMore(result.hasNext);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        isFetchingMoreRef.current = false;
      }
    },
    [assetId, vsCurrency, hasMore],
  );

  useEffect(() => {
    loadInitial();
    return () => abortRef.current?.abort();
  }, [loadInitial]);

  // Poll for real-time updates every 10 seconds
  // TODO: Replace with WebSocket subscription when ready (see REALTIME_UPDATES_IMPLEMENTATION.md)
  useEffect(() => {
    if (!enabled || !assetId || isLoading) return;

    const pollForUpdates = async () => {
      try {
        // Fetch a small window (1h) to get just the latest candle
        // This minimizes data transfer while ensuring we get the current forming candle
        const result = await fetchOHLCV(assetId, {
          timePeriod: '1h',
          interval,
          vsCurrency,
        });
        console.log(
          '[useOHLCVChart] Polling received',
          result.data.length,
          'candles',
        );

        if (result.data.length > 0) {
          const latestCandle = mapCandle(result.data[result.data.length - 1]);
          console.log(
            '[useOHLCVChart] Latest candle from API:',
            JSON.stringify(latestCandle),
          );

          setOhlcvData((prev) => {
            if (prev.length === 0) {
              console.log(
                '[useOHLCVChart] No previous data, returning latest candle',
              );
              return [latestCandle];
            }

            const lastCandle = prev[prev.length - 1];
            console.log(
              '[useOHLCVChart] Last candle in state:',
              JSON.stringify(lastCandle),
            );

            // If same candle (same opening time), update it (candle is still forming)
            if (lastCandle.time === latestCandle.time) {
              const hasChanged =
                lastCandle.close !== latestCandle.close ||
                lastCandle.high !== latestCandle.high ||
                lastCandle.low !== latestCandle.low ||
                lastCandle.volume !== latestCandle.volume;
              console.log(
                '[useOHLCVChart] ✓ Updating existing candle (same time). Data changed:',
                hasChanged,
              );
              return [...prev.slice(0, -1), latestCandle];
            }

            // New candle — append it
            console.log(
              '[useOHLCVChart] ✓ Appending new candle (different time)',
            );
            return [...prev, latestCandle];
          });
        }
      } catch (err) {
        console.error('[useOHLCVChart] Polling update failed:', err);
        // Don't set error state — keep showing existing data
      }
    };

    // Poll immediately on mount, then every 10 seconds
    pollForUpdates();
    pollingIntervalRef.current = setInterval(pollForUpdates, 10000);

    // Cleanup on unmount or dependency change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [assetId, timePeriod, interval, vsCurrency, enabled, isLoading]);

  return { ohlcvData, isLoading, error, hasMore, fetchMoreHistory };
};
