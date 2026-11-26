import {
  useMutation,
  useQuery,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { reportNetworkFailure, type NetworkIntent } from './errorReporting';
import { isTierPolicyEnabled } from './killSwitch';
import {
  resolveGcTime,
  resolvePoll,
  resolveRetryDelay,
  shouldRetryQuery,
  STALE_TIMES,
  type Freshness,
  type PollProfile,
} from './policies';

/** Caching, retries and polling are owned by the hook and follow the tier. */
type OwnedQueryOptions =
  | 'retry'
  | 'retryDelay'
  | 'gcTime'
  | 'staleTime'
  | 'refetchInterval'
  | 'refetchIntervalInBackground'
  | 'networkMode';

export type NetworkQueryOptions<
  QueryData,
  Data = QueryData,
  Key extends QueryKey = QueryKey,
> = Omit<UseQueryOptions<QueryData, Error, Data, Key>, OwnedQueryOptions> &
  NetworkIntent & {
    freshness?: Freshness;
    poll?: PollProfile;
  };

/**
 * The app's query hook. Feature hooks call it with their key, fetcher and
 * intent; it resolves staleness, retries, polling and memory for the current
 * device and connection, and reports the terminal failure once.
 */
export function useNetworkQuery<
  QueryData,
  Data = QueryData,
  Key extends QueryKey = QueryKey,
>({
  feature,
  operation,
  expectedStatuses,
  freshness = 'standard',
  poll = 'manual',
  ...options
}: NetworkQueryOptions<QueryData, Data, Key>): UseQueryResult<Data, Error> {
  return useQuery({
    ...options,
    staleTime: STALE_TIMES[freshness],
    gcTime: resolveGcTime(getNetworkConditions(), isTierPolicyEnabled()),
    // Functions so each retry or poll reads the conditions at that moment.
    retry: (index, error) => {
      const again = shouldRetryQuery(
        index,
        error,
        getNetworkConditions(),
        isTierPolicyEnabled(),
      );
      // TanStack asks once per failed attempt, so "no" marks the terminal failure.
      if (!again)
        reportNetworkFailure(
          error,
          { feature, operation, expectedStatuses },
          index + 1,
        );
      return again;
    },
    retryDelay: (index, error) =>
      resolveRetryDelay(
        index,
        error,
        getNetworkConditions(),
        isTierPolicyEnabled(),
      ),
    refetchInterval: () =>
      resolvePoll(poll, getNetworkConditions(), isTierPolicyEnabled()),
  });
}

/**
 * The app's mutation hook. A mutation is never retried and never waits for the
 * connection, so nothing replays after a reconnect.
 */
export function useNetworkMutation<Data, Variables = void, Context = unknown>({
  feature,
  operation,
  expectedStatuses,
  onError,
  ...options
}: Omit<
  UseMutationOptions<Data, Error, Variables, Context>,
  'retry' | 'retryDelay' | 'networkMode'
> &
  NetworkIntent): UseMutationResult<Data, Error, Variables, Context> {
  return useMutation({
    ...options,
    retry: false,
    networkMode: 'always',
    onError: (error, ...rest) => {
      reportNetworkFailure(error, { feature, operation, expectedStatuses }, 1);
      return onError?.(error, ...rest);
    },
  });
}
