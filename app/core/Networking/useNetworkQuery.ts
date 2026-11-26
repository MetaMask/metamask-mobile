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

const MINUTE = 60 * 1000;

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
 * `useQuery` that adapts to the device and connection: one retry instead of
 * two and slower polling on a slow connection, a shorter cache on devices with
 * less memory. Retry and polling read the connection when they run, so the
 * query does not re-render when the connection changes.
 */
export function useNetworkQuery<
  QueryFnData,
  Data = QueryFnData,
  Key extends QueryKey = QueryKey,
>({
  refetchInterval,
  ...options
}: NetworkQueryOptions<QueryFnData, Data, Key>): UseQueryResult<Data, Error> {
  const [gcTime] = useState(resolveGcTime);

  return useQuery({
    ...options,
    gcTime,
    retry: shouldRetry,
    refetchInterval: () => resolvePollInterval(refetchInterval),
  });
}

function resolveGcTime(): number {
  const hardwareTier = getHardwareTier();
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
