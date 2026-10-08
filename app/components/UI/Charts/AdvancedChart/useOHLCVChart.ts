import { useMemo } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import type { OHLCVBar } from './AdvancedChart.types';
import type { OHLCVTimePeriod } from './TimeRangeSelector';

const OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';
const OHLCV_FETCH_TIMEOUT_MS = 3000;
const QUERY_STALE_TIME_MS = 30_000;

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
  assetId: string;
  timePeriod: OHLCVTimePeriod;
  interval?: string;
  vsCurrency?: string;
}

export interface UseOHLCVChartResult {
  ohlcvData: OHLCVBar[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
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

const buildOhlcvChartUrl = (request: UseOHLCVChartOptions): string => {
  const url = new URL(`${OHLCV_BASE_URL}/${request.assetId}`);

  if (request.timePeriod) {
    url.searchParams.set('timePeriod', request.timePeriod);
  }

  if (request.interval) {
    url.searchParams.set('interval', request.interval);
  }

  if (request.vsCurrency) {
    url.searchParams.set('vsCurrency', request.vsCurrency);
  }

  return url.toString();
};

const fetchOHLCV = async (
  request: UseOHLCVChartOptions,
  signal?: AbortSignal,
): Promise<OHLCVApiResponse> => {
  const url = buildOhlcvChartUrl(request);
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('OHLCV fetch timeout')),
        OHLCV_FETCH_TIMEOUT_MS,
      );
    });

    const response = await Promise.race([
      fetch(url, { signal }),
      timeoutPromise,
    ]);

    if (!response.ok) {
      throw new Error(`OHLCV API error: ${response.status}`);
    }

    return response.json();
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error');
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

export const ohlcvChartQueryOptions = (request: UseOHLCVChartOptions) =>
  queryOptions({
    queryKey: [
      'token-details',
      'ohlcv-chart',
      request.assetId,
      request.timePeriod,
      request.interval ?? null,
      request.vsCurrency ?? null,
    ],
    queryFn: ({ signal }) => fetchOHLCV(request, signal),
    retry: false,
    staleTime: QUERY_STALE_TIME_MS,
  });

export const useOHLCVChart = ({
  assetId,
  timePeriod,
  interval,
  vsCurrency,
}: UseOHLCVChartOptions): UseOHLCVChartResult => {
  const query = useQuery({
    ...ohlcvChartQueryOptions({ assetId, timePeriod, interval, vsCurrency }),
    enabled: Boolean(assetId),
  });

  const response = query.data;
  const ohlcvData = useMemo(
    () => (response ? response.data.map(mapCandle) : []),
    [response],
  );
  const errorMessage =
    query.error instanceof Error
      ? query.error.message
      : query.error
        ? 'Unknown error'
        : null;

  return {
    ohlcvData,
    isLoading: Boolean(assetId) && query.isPending,
    error: errorMessage,
    hasMore: response?.hasNext ?? false,
    nextCursor: response?.nextCursor || null,
    hasEmptyData: Boolean(
      response && response.data.length === 0 && !query.error,
    ),
  };
};
