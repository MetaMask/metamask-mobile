import { queryOptions } from '@tanstack/react-query';
import type { OHLCVTimePeriod } from './TimeRangeSelector';

export const OHLCV_BASE_URL = 'https://price.api.cx.metamask.io/v3/ohlcv-chart';

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

export interface OhlcvChartRequest {
  assetId: string;
  timePeriod: OHLCVTimePeriod;
  interval?: string;
  vsCurrency?: string;
}

const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error != null &&
  'name' in error &&
  (error as { name: string }).name === 'AbortError';

export const buildOhlcvChartUrl = (
  request: OhlcvChartRequest,
  nextCursor?: string,
): string => {
  const url = new URL(`${OHLCV_BASE_URL}/${request.assetId}`);

  if (nextCursor) {
    url.searchParams.set('nextCursor', nextCursor);
  } else if (request.timePeriod) {
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

export const fetchOHLCV = async (
  request: OhlcvChartRequest,
  signal?: AbortSignal,
  nextCursor?: string,
): Promise<OHLCVApiResponse> => {
  const url = buildOhlcvChartUrl(request, nextCursor);
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
    if (signal?.aborted || isAbortError(error)) {
      throw error;
    }
    throw error instanceof Error ? error : new Error('Unknown error');
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

export const ohlcvChartQueryOptions = (request: OhlcvChartRequest) =>
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
