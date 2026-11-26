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
import { getLatencySnapshot } from '../../util/deviceCapability/latencyStore';
import { LATENCY_THRESHOLDS } from '../../util/deviceCapability/thresholds';

const MINUTE = 60 * 1000;

type QueryFn<QueryFnData, Key extends QueryKey> = UseQueryOptions<
  QueryFnData,
  Error,
  QueryFnData,
  Key
>['queryFn'];

export class NetworkTimeoutError extends Error {
  constructor() {
    super('Network request timed out');
    this.name = 'NetworkTimeoutError';
  }
}

const GC_TIME: Record<HardwareTier, number> = {
  LOW: 5 * MINUTE,
  MID: 60 * MINUTE,
  HIGH: 24 * 60 * MINUTE,
};

function isSlowConnection(): boolean {
  return (
    getNetworkTierSnapshot() === 'SLOW_CELLULAR' ||
    getLatencySnapshot() === 'SLOW'
  );
}

export type NetworkQueryOptions<
  QueryFnData,
  Data = QueryFnData,
  Key extends QueryKey = QueryKey,
> = Omit<
  UseQueryOptions<QueryFnData, Error, Data, Key>,
  'retry' | 'gcTime' | 'refetchInterval'
> & {
  /** Poll interval in ms on a good connection. Tripled on a slow one. */
  refetchInterval?: number;
};

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
  const [hardwareTier] = useState(getHardwareTier);

  return useQuery({
    ...options,
    queryFn: withTimeout(queryFn, resolveTimeout(hardwareTier)),
    gcTime: resolveGcTime(hardwareTier),
    retry: shouldRetry,
    refetchInterval: () => resolvePollInterval(refetchInterval),
  });
}

/**
 * Aborts the attempt after the timeout and fails it with
 * `NetworkTimeoutError`, even when the fetcher ignores the abort signal.
 * TanStack's own cancellation still aborts the request.
 */
function withTimeout<QueryFnData, Key extends QueryKey>(
  queryFn: QueryFn<QueryFnData, Key>,
  timeoutMs: number,
): QueryFn<QueryFnData, Key> {
  if (typeof queryFn !== 'function') return queryFn;

  return async (context) => {
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    context.signal.addEventListener('abort', abort);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new NetworkTimeoutError());
      }, timeoutMs);
    });
    try {
      const request = queryFn({ ...context, signal: controller.signal });
      return await Promise.race([request, timedOut]);
    } finally {
      clearTimeout(timer);
      context.signal.removeEventListener('abort', abort);
    }
  };
}

// Calibrated per hardware tier from production `http.client` p99 durations.
function resolveTimeout(hardwareTier: HardwareTier | null): number {
  if (hardwareTier === null) return LATENCY_THRESHOLDS.MID.hungMs;
  return LATENCY_THRESHOLDS[hardwareTier].hungMs;
}

function resolveGcTime(hardwareTier: HardwareTier | null): number {
  // Unknown hardware keeps the app's 24 h default.
  if (hardwareTier === null) return GC_TIME.HIGH;
  return GC_TIME[hardwareTier];
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
