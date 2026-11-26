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

interface NetworkIntent {
  /** Static feature identifier used in error reports and spans. */
  feature: string;
  /** Static operation identifier used in error reports and spans. */
  operation: string;
  /** HTTP statuses the feature handles itself and does not report. */
  expectedStatuses?: readonly number[];
}

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
  meta,
  ...options
}: NetworkQueryOptions<QueryData, Data, Key>): UseQueryResult<Data, Error> {
  return useQuery({
    ...options,
    meta: { ...meta, networking: true, feature, operation, expectedStatuses },
    networkMode: 'online',
    staleTime: STALE_TIMES[freshness],
    gcTime: resolveGcTime(getNetworkConditions(), isTierPolicyEnabled()),
    // Functions so each retry or poll reads the conditions at that moment.
    retry: (index, error) =>
      shouldRetryQuery(
        index,
        error,
        getNetworkConditions(),
        isTierPolicyEnabled(),
      ),
    retryDelay: (index, error) =>
      resolveRetryDelay(
        index,
        error,
        getNetworkConditions(),
        isTierPolicyEnabled(),
      ),
    refetchInterval: () =>
      resolvePoll(poll, getNetworkConditions(), isTierPolicyEnabled()),
    refetchIntervalInBackground: false,
  });
}

/**
 * The app's mutation hook. A mutation never retries and never waits for the
 * connection: offline, it fails at once (global defaults in ReactQueryService).
 */
export function useNetworkMutation<Data, Variables = void, Context = unknown>({
  feature,
  operation,
  expectedStatuses,
  meta,
  ...options
}: Omit<
  UseMutationOptions<Data, Error, Variables, Context>,
  'retry' | 'retryDelay' | 'networkMode'
> &
  NetworkIntent): UseMutationResult<Data, Error, Variables, Context> {
  return useMutation({
    ...options,
    meta: { ...meta, networking: true, feature, operation, expectedStatuses },
  });
}
