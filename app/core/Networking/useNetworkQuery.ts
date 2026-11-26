import { useState } from 'react';
import {
  useQuery,
  type QueryFunction,
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
  /** Pass `signal` to `fetch` so a timeout or cancellation stops the request. */
  queryFn: QueryFunction<QueryFnData, Key>;
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

export class NetworkTimeoutError extends Error {
  constructor() {
    super('Network request timed out');
    this.name = 'NetworkTimeoutError';
  }
}

/**
 * Times out after the device's hung threshold, the same one the latency
 * signal uses. Fails with `NetworkTimeoutError` even when the fetcher ignores
 * the abort, so a stalled request still reaches retry and the error state.
 */
function withTimeout<QueryFnData, Key extends QueryKey>(
  queryFn: QueryFunction<QueryFnData, Key>,
): QueryFunction<QueryFnData, Key> {
  return async (context) => {
    const controller = new AbortController();
    // TanStack makes one signal per fetch, so the listener does not outlive it.
    context.signal.addEventListener('abort', () => controller.abort());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new NetworkTimeoutError());
      }, getLatencyThresholds().hungMs);
    });
    try {
      const request = queryFn({ ...context, signal: controller.signal });
      return await Promise.race([request, timedOut]);
    } finally {
      clearTimeout(timer);
    }
  };
}

function isSlowConnection(): boolean {
  return (
    getNetworkTierSnapshot() === 'SLOW_CELLULAR' ||
    getLatencySnapshot() === 'SLOW'
  );
}

function shouldRetry(failureCount: number): boolean {
  if (isSlowConnection()) return failureCount < 1;
  return failureCount < 2;
}

function resolvePollInterval(interval: number | undefined): number | false {
  if (interval === undefined) return false;
  if (isSlowConnection()) return interval * 3;
  return interval;
}

/**
 * `useQuery` that adapts to the device and connection: every attempt times
 * out (8 s to 30 s by hardware tier), one retry instead of two and slower
 * polling on a slow connection, a shorter cache on devices with less memory.
 * Retry and polling read the connection when they run, so the query does not
 * re-render when the connection changes.
 */
export function useNetworkQuery<
  QueryFnData,
  Data = QueryFnData,
  Key extends QueryKey = QueryKey,
>({
  queryFn,
  refetchInterval,
  ...options
}: NetworkQueryOptions<QueryFnData, Data, Key>): UseQueryResult<Data, Error> {
  // RAM does not change while the app runs.
  const [gcTime] = useState(() => GC_TIME[getHardwareTier() ?? 'UNKNOWN']);

  return useQuery({
    ...options,
    queryFn: withTimeout(queryFn),
    gcTime,
    retry: shouldRetry,
    refetchInterval: () => resolvePollInterval(refetchInterval),
  });
}
