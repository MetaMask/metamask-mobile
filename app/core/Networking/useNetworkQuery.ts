import { useState } from 'react';
import {
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from '@tanstack/react-query';
import { resolveGcTime, resolvePollInterval, shouldRetry } from './policy';
import { networkAttempt } from './networkAttempt';
import type { NetworkQueryOptions } from './types';

/**
 * The app's read hook: it GETs `url`, validates the body with `parse` and
 * caches the result. Each attempt times out (`networkAttempt`); retries, polling
 * and cache time adapt to the device and connection (`policy`). Offline, the
 * query pauses and runs when the connection returns.
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
  const [gcTime] = useState(resolveGcTime);

  return useQuery({
    ...options,
    queryFn: async ({ signal }): Promise<QueryFnData> =>
      networkAttempt(url, parse, signal),
    gcTime,
    retry: shouldRetry,
    refetchInterval: () => resolvePollInterval(refetchInterval),
  });
}
