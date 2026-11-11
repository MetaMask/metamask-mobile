import { useMemo } from 'react';
import {
  queryOptions,
  useQuery,
  type QueryClient,
} from '@tanstack/react-query';
import type { OHLCVBar } from './AdvancedChart.types';
import { TIME_RANGE_CONFIGS, type OHLCVTimePeriod } from './TimeRangeSelector';
import { PRICE_API_BASE_URL } from '../../../../constants/urls';
import { usePriceApiHost } from '../../TokenDetails/context/PriceApiHostContext';

const OHLCV_CHART_PATH = '/v3/ohlcv-chart';
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
  /** Price API origin. Omitted means prod. */
  baseUrl?: string;
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
  const url = new URL(
    `${request.baseUrl ?? PRICE_API_BASE_URL}${OHLCV_CHART_PATH}/${
      request.assetId
    }`,
  );

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
      // Keyed by host so a non-prod response never surfaces under the prod
      // entry, or the other way round.
      request.baseUrl ?? PRICE_API_BASE_URL,
    ],
    queryFn: ({ signal }) => fetchOHLCV(request, signal),
    retry: false,
    staleTime: QUERY_STALE_TIME_MS,
  });

/**
 * @param baseUrl - Price API origin. Passed explicitly rather than read from
 * context because this runs outside the React tree, and it has to match what
 * the hook will ask for or the warmed entry is never read.
 */
export const prefetchOhlcvChart = (
  queryClient: QueryClient,
  assetId: string | null,
  vsCurrency: string,
  baseUrl?: string,
): void => {
  if (!assetId) {
    return;
  }
  const { timePeriod, interval } = TIME_RANGE_CONFIGS['1D'];
  queryClient
    .query(
      ohlcvChartQueryOptions({
        assetId,
        timePeriod,
        interval,
        vsCurrency,
        baseUrl,
      }),
    )
    .catch(() => undefined);
};

export const useOHLCVChart = ({
  assetId,
  timePeriod,
  interval,
  vsCurrency,
  baseUrl,
}: UseOHLCVChartOptions): UseOHLCVChartResult => {
  // Outside a `PriceApiHostProvider` this is prod, which is what keeps the
  // Social Leaderboard trader charts and the legacy Token Details page on the
  // host they already use without either of them passing anything.
  const contextBaseUrl = usePriceApiHost();

  const query = useQuery({
    ...ohlcvChartQueryOptions({
      assetId,
      timePeriod,
      interval,
      vsCurrency,
      baseUrl: baseUrl ?? contextBaseUrl,
    }),
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
