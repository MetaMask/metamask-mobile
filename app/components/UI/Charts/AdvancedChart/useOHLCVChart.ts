import { useCallback, useEffect, useRef, useState } from 'react';
import type { OHLCVBar } from './AdvancedChart.types';
import type { OHLCVTimePeriod } from './TimeRangeSelector';

const OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';

export interface OHLCVApiCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCVApiResponse {
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
}

export interface UseOHLCVChartResult {
  ohlcvData: OHLCVBar[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  /** Opaque cursor for the next page. Pass to the WebView so it can fetch directly. */
  nextCursor: string | null;
  /** True if the API returned an empty data array (asset not supported for OHLCV) */
  hasEmptyData: boolean;
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

  const apiStartTime = Date.now();
  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(`OHLCV API error: ${response.status}`);
  }

  const apiData = await response.json();
  const apiDuration = Date.now() - apiStartTime;

  // eslint-disable-next-line no-console
  console.log(
    `[perf] API returned in ${apiDuration}ms (${apiData.data?.length ?? 0} candles)`,
  );

  return apiData;
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
}: UseOHLCVChartOptions): UseOHLCVChartResult => {
  const [ohlcvData, setOhlcvData] = useState<OHLCVBar[]>([]);
  const [isLoading, setIsLoading] = useState(!!assetId);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [hasEmptyData, setHasEmptyData] = useState(false);

  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadInitial = useCallback(async () => {
    if (!assetId) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setNextCursor(null);
    setHasMore(false);
    setHasEmptyData(false);

    const apiStartTime = Date.now();
    // eslint-disable-next-line no-console
    console.log(
      `[perf] useOHLCVChart: API call started for assetId=${assetId}, timePeriod=${timePeriod}`,
    );

    try {
      const result = await fetchOHLCV(
        assetId,
        { timePeriod, interval, vsCurrency },
        controller.signal,
      );

      const apiEndTime = Date.now();
      const apiDuration = apiEndTime - apiStartTime;
      // eslint-disable-next-line no-console
      console.log(
        `[perf] useOHLCVChart: API call completed in ${apiDuration}ms, received ${result.data.length} candles`,
      );

      if (!controller.signal.aborted) {
        const isEmpty = result.data.length === 0;
        setHasEmptyData(isEmpty);
        setOhlcvData(result.data.map(mapCandle));
        setNextCursor(result.nextCursor || null);
        setHasMore(result.hasNext);

        const dataMappedTime = Date.now();
        // eslint-disable-next-line no-console
        console.log(
          `[perf] useOHLCVChart: Data mapped and state updated in ${dataMappedTime - apiEndTime}ms`,
        );
      }
    } catch (e) {
      const apiEndTime = Date.now();
      const apiDuration = apiEndTime - apiStartTime;
      // eslint-disable-next-line no-console
      console.log(
        `[perf] useOHLCVChart: API call failed after ${apiDuration}ms`,
        e,
      );
      if (!controller.signal.aborted) {
        setOhlcvData([]); // Clear data on error to show error state
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [assetId, timePeriod, interval, vsCurrency]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(
      `[perf] useOHLCVChart: Effect triggered - parameters changed (assetId=${assetId}, timePeriod=${timePeriod}, interval=${interval})`,
    );
    loadInitial();
    return () => abortRef.current?.abort();
  }, [loadInitial, assetId, timePeriod, interval]);

  return { ohlcvData, isLoading, error, hasMore, nextCursor, hasEmptyData };
};
