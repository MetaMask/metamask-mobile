import { useState } from 'react';
import {
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from '@tanstack/react-query';
import { resolveGcTime, resolvePollInterval, shouldRetry } from './policy';
import { networkAttempt } from './networkAttempt';
import { readStoredQuery, writeStoredQuery } from './persistence';
import { NetworkCache, type NetworkQueryOptions } from './types';

/**
 * The app's read hook: it GETs `url`, validates the body with `parse` and
 * caches the result. Each attempt times out (`networkAttempt`); retries, polling
 * and cache time adapt to the device and connection (`policy`). Offline, the
 * query pauses and runs when the connection returns. `cache` also saves public
 * responses across restarts (`persistence`).
 */
export function useNetworkQuery<
  QueryFnData,
  Data = QueryFnData,
  Key extends QueryKey = QueryKey,
>({
  url,
  parse,
  refetchInterval,
  cache = NetworkCache.NONE,
  ...options
}: NetworkQueryOptions<QueryFnData, Data, Key>): UseQueryResult<Data, Error> {
  // RAM does not change while the app runs.
  const [gcTime] = useState(resolveGcTime);

  // One read serves both initial options; only a query not yet in memory asks.
  let stored: ReturnType<typeof readStoredQuery<QueryFnData>> | undefined;
  const readStored = () => {
    stored ??= readStoredQuery(options.queryKey, cache, parse);
    return stored;
  };

  return useQuery({
    ...options,
    initialData: () => readStored()?.data,
    initialDataUpdatedAt: () => readStored()?.savedAt,
    queryFn: async ({ signal }): Promise<QueryFnData> =>
      networkAttempt(
        url,
        (body) => {
          const data = parse(body);
          writeStoredQuery(options.queryKey, cache, body);
          return data;
        },
        signal,
      ),
    gcTime,
    retry: shouldRetry,
    refetchInterval: () => resolvePollInterval(refetchInterval),
  });
}
