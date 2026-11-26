import { useState } from 'react';
import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import {
  getHardwareTier,
  getNetworkTierSnapshot,
  type HardwareTier,
} from '../../util/deviceCapability';
import {
  getLatencySnapshot,
  getLatencyThresholds,
} from '../../util/deviceCapability/latencyStore';

export type NetworkQueryOptions<
  QueryFnData,
  Data = QueryFnData,
  Key extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<QueryFnData, Error, Data, Key>,
  'queryFn' | 'retry' | 'gcTime' | 'refetchInterval'
> & {
  /**
   * URL to GET. The hook makes the request; callers never call `fetch`.
   * Put every value that changes the URL in `queryKey`.
   */
  url: string;
  /** Turns the untrusted JSON body into the query data. Throw to fail. */
  parse: (body: unknown) => QueryFnData;
  /** Poll interval in ms on a good connection. Tripled on a slow one. */
  refetchInterval?: number;
};

const MINUTE = 60 * 1000;

// Unknown hardware keeps the app's 24 h default.
const GC_TIME: Record<HardwareTier | 'UNKNOWN', number> = {
  LOW: 5 * MINUTE,
  MID: 60 * MINUTE,
  HIGH: 24 * 60 * MINUTE,
  UNKNOWN: 24 * 60 * MINUTE,
};

// Client errors that can succeed on a later attempt.
const RETRYABLE_CLIENT_STATUSES = [408, 429];

export class NetworkTimeoutError extends Error {
  constructor() {
    super('Network request timed out');
    this.name = 'NetworkTimeoutError';
  }
}

/** A response outside 2xx. Carries the status only, never the URL. */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** The body was not JSON, or `parse` rejected it. Not retried. */
export class InvalidResponseError extends Error {
  constructor(cause: unknown) {
    super('Invalid response body', { cause });
    this.name = 'InvalidResponseError';
  }
}

async function getJson<QueryFnData>(
  url: string,
  parse: (body: unknown) => QueryFnData,
  signal: AbortSignal,
): Promise<QueryFnData> {
  // The query cache is the only cache, so a refetch always reaches the server.
  const response = await fetch(url, { signal, cache: 'no-cache' });
  if (!response.ok) throw new HttpError(response.status);
  try {
    return parse(await response.json());
  } catch (error) {
    throw new InvalidResponseError(error);
  }
}

/**
 * Aborts the request after the device's hung threshold, the same one the
 * latency signal uses, and fails with `NetworkTimeoutError` even if the
 * native request ignores the abort, so a stall still reaches retry and the
 * error state. Query cancellation aborts the request too.
 */
async function request<QueryFnData>(
  url: string,
  parse: (body: unknown) => QueryFnData,
  querySignal: AbortSignal,
): Promise<QueryFnData> {
  const controller = new AbortController();
  // TanStack makes one signal per fetch, so the listener does not outlive it.
  querySignal.addEventListener('abort', () => controller.abort());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new NetworkTimeoutError());
    }, getLatencyThresholds().hungMs);
  });
  try {
    return await Promise.race([
      getJson(url, parse, controller.signal),
      timedOut,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function isSlowConnection(): boolean {
  return (
    getNetworkTierSnapshot() === 'SLOW_CELLULAR' ||
    getLatencySnapshot() === 'SLOW'
  );
}

function isRetryable(error: Error): boolean {
  if (error instanceof InvalidResponseError) return false;
  if (!(error instanceof HttpError)) return true;
  if (error.status >= 500) return true;
  return RETRYABLE_CLIENT_STATUSES.includes(error.status);
}

function shouldRetry(failureCount: number, error: Error): boolean {
  if (!isRetryable(error)) return false;
  if (isSlowConnection()) return failureCount < 1;
  return failureCount < 2;
}

function resolvePollInterval(interval: number | undefined): number | false {
  if (interval === undefined) return false;
  if (isSlowConnection()) return interval * 3;
  return interval;
}

/**
 * The app's read hook: it GETs `url`, validates the body with `parse` and
 * caches the result. Every attempt times out (8 s to 30 s by hardware tier);
 * client errors and invalid bodies are not retried; a slow connection gets one retry instead of
 * two and slower polling; devices with less memory keep a shorter cache.
 * Offline, the query pauses and runs when the connection returns.
 * Retry and polling read the connection when they run, so the query does not
 * re-render when the connection changes.
 */
export function useNetworkQuery<
  QueryFnData,
  Data = QueryFnData,
  Key extends QueryKey = QueryKey,
>({
  url,
  parse,
  refetchInterval,
  ...options
}: NetworkQueryOptions<QueryFnData, Data, Key>): UseQueryResult<Data, Error> {
  // RAM does not change while the app runs.
  const [gcTime] = useState(() => GC_TIME[getHardwareTier() ?? 'UNKNOWN']);

  return useQuery({
    ...options,
    queryFn: async ({ signal }): Promise<QueryFnData> =>
      request(url, parse, signal),
    gcTime,
    retry: shouldRetry,
    refetchInterval: () => resolvePollInterval(refetchInterval),
  });
}
