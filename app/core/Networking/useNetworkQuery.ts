import { useState } from 'react';
import {
  useQuery,
  type QueryKey,
  type UseQueryResult,
} from '@tanstack/react-query';
import { resolveGcTime, resolvePollInterval, shouldRetry } from './policy';
import { networkAttempt } from './networkAttempt';
import {
  readStoredQuery,
  writeStoredQuery,
  type StoredQuery,
} from './persistence';
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
  cacheProjection,
  ...options
}: NetworkQueryOptions<QueryFnData, Data, Key>): UseQueryResult<Data, Error> {
  // RAM does not change while the app runs.
  const [gcTime] = useState(resolveGcTime);

  // One read serves both initial options; only a query not yet in memory asks.
  let stored: StoredQuery<QueryFnData> | null | undefined;
  const readStored = (): StoredQuery<QueryFnData> | null => {
    if (stored !== undefined) return stored;
    stored = readStoredQuery(
      options.queryKey,
      cache,
      parse,
      Date.now(),
      cacheProjection?.slot,
    );
    return stored;
  };

  return useQuery({
    ...options,
    // A restored projection is sufficient to render, not to replace fresh data.
    refetchOnMount: (query) => {
      if (cacheProjection && query.state.dataUpdateCount === 0) return 'always';
      const option = options.refetchOnMount;
      if (typeof option === 'function') return option(query);
      return option ?? true;
    },
    initialData: () => readStored()?.data,
    initialDataUpdatedAt: () => readStored()?.savedAt,
    queryFn: async ({ signal }): Promise<QueryFnData> => {
      let bodyToStore: unknown;
      const data = await networkAttempt(
        url,
        (body) => {
          bodyToStore = body;
          return parse(body);
        },
        signal,
      );
      if (cache !== NetworkCache.NONE && !signal.aborted) {
        try {
          if (cacheProjection) bodyToStore = cacheProjection.project(data);
          if (bodyToStore !== undefined) {
            writeStoredQuery(
              options.queryKey,
              cache,
              bodyToStore,
              Date.now(),
              cacheProjection?.slot,
            );
          }
        } catch {
          // An uncacheable response is still usable in memory.
        }
      }
      return data;
    },
    gcTime,
    retry: shouldRetry,
    refetchInterval: () => resolvePollInterval(refetchInterval),
  });
}
