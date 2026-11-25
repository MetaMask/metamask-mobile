import {
  queryOptions,
  type QueryKey,
  type UnusedSkipTokenOptions,
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

interface QueryIntent {
  feature: string;
  operation: string;
  freshness?: Freshness;
  poll?: PollProfile;
  /** Only successful, public, non-address-scoped, unauthenticated data. */
  persist?: boolean;
  expectedStatuses?: readonly number[];
}

/** Creates standard TanStack options without subscribing a component to device conditions. */
export function networkQueryOptions<
  QueryData,
  Data = QueryData,
  Key extends QueryKey = QueryKey,
>(
  options: Omit<
    UnusedSkipTokenOptions<QueryData, Error, Data, Key>,
    | 'retry'
    | 'retryDelay'
    | 'gcTime'
    | 'staleTime'
    | 'refetchInterval'
    | 'refetchIntervalInBackground'
    | 'networkMode'
  > &
    QueryIntent,
) {
  const {
    feature,
    operation,
    freshness = 'standard',
    poll = 'manual',
    persist = false,
    expectedStatuses,
    meta,
    ...rest
  } = options;
  return queryOptions({
    ...rest,
    meta: {
      ...meta,
      networking: true,
      feature,
      operation,
      persist,
      expectedStatuses,
    },
    networkMode: 'online',
    staleTime: STALE_TIMES[freshness],
    gcTime: resolveGcTime(getNetworkConditions(), isTierPolicyEnabled()),
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
