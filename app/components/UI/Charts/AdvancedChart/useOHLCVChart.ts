import { useCallback, useEffect, useRef, useState } from 'react';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../../../util/trace';
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

function getOhlcvSeriesTraceId({
  assetId,
  timePeriod,
  interval,
  vsCurrency,
}: UseOHLCVChartOptions): string {
  return `${assetId}|${timePeriod}|${interval ?? ''}|${vsCurrency ?? ''}`;
}

function getOhlcvFetchTraceData({
  assetId,
  timePeriod,
  interval,
  vsCurrency,
}: UseOHLCVChartOptions): Record<string, TraceValue> {
  return {
    assetId,
    timePeriod,
    interval: interval ?? '',
    vsCurrency: vsCurrency ?? '',
  };
}

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

  // Add 3 second timeout to prevent infinite hang
  const FETCH_TIMEOUT_MS = 3000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error('OHLCV fetch timeout')),
      FETCH_TIMEOUT_MS,
    );
  });

  const response = await Promise.race([
    fetch(url.toString(), { signal }),
    timeoutPromise,
  ]);

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
    const traceId = getOhlcvSeriesTraceId({
      assetId,
      timePeriod,
      interval,
      vsCurrency,
    });
    const traceData = getOhlcvFetchTraceData({
      assetId,
      timePeriod,
      interval,
      vsCurrency,
    });
    let endTraceData: Record<string, TraceValue> = {
      ...traceData,
      success: false,
    };

    setIsLoading(true);
    setError(null);
    setNextCursor(null);
    setHasMore(false);
    setHasEmptyData(false);

    trace({
      name: TraceName.TokenOverviewAdvancedChartOhlcvFetch,
      op: TraceOperation.TokenOverviewAdvancedChartOhlcvFetch,
      id: traceId,
      data: traceData,
    });

    try {
      const result = await fetchOHLCV(
        assetId,
        { timePeriod, interval, vsCurrency },
        controller.signal,
      );

      const isEmpty = result.data.length === 0;
      endTraceData = {
        ...traceData,
        success: true,
        hasEmptyData: isEmpty,
        barCount: result.data.length,
        hasMore: result.hasNext,
      };

      if (!controller.signal.aborted) {
        setHasEmptyData(isEmpty);
        setOhlcvData(result.data.map(mapCandle));
        setNextCursor(result.nextCursor || null);
        setHasMore(result.hasNext);
      }
    } catch (e) {
      endTraceData = {
        ...traceData,
        success: false,
        aborted: controller.signal.aborted,
        errorMessage: e instanceof Error ? e.message.slice(0, 200) : String(e),
      };
      if (!controller.signal.aborted) {
        setOhlcvData([]); // Clear data on error to show error state
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    } finally {
      endTrace({
        name: TraceName.TokenOverviewAdvancedChartOhlcvFetch,
        id: traceId,
        data: endTraceData,
      });
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [assetId, timePeriod, interval, vsCurrency]);

  useEffect(() => {
    loadInitial();
    return () => abortRef.current?.abort();
  }, [loadInitial]);

  return { ohlcvData, isLoading, error, hasMore, nextCursor, hasEmptyData };
};
