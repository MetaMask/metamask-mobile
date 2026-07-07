/**
 * Maps the Predict domain's activity feed into the shared `ActivityListItem`
 * shape for the unified Activity list.
 *
 * Source of truth is `usePredictActivity`, which fetches each provider's
 * settled activity (Polymarket etc.) by account address. This hook only
 * normalizes each `PredictActivity` through `mapPredictActivity`; it does not
 * fetch or merge.
 *
 * `usePredictActivity` triggers a Polygon-network-ensure side effect on mount,
 * so this hook must only be mounted when Predict is enabled — see
 * `PredictActivitySource`.
 */
import { useCallback, useMemo } from 'react';
import type { CaipChainId } from '@metamask/utils';
import {
  mapPredictActivity,
  type ActivityListItem,
} from '../../../../util/activity-adapters';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { usePredictActivity } from '../../../UI/Predict/hooks/usePredictActivity';

/** Polymarket settles on Polygon; injected as the activity chainId. */
const PREDICT_ACTIVITY_CHAIN_ID = 'eip155:137' as CaipChainId;

/** Polymarket bets are denominated in USDC. */
const PREDICT_QUOTE_ASSET = { symbol: 'USDC' };

export interface UsePredictActivityItemsResult {
  items: ActivityListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Loads the next page of predict history (Polymarket paginates by offset). */
  loadMore: () => Promise<void>;
  /** Whether more predict history is available to load. */
  hasMore: boolean;
  /** Whether a load-more request is currently in flight. */
  isFetchingMore: boolean;
}

export function usePredictActivityItems(): UsePredictActivityItemsResult {
  const {
    activity,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePredictActivity();

  const items = useMemo(() => {
    const result: ActivityListItem[] = [];
    for (const entry of activity) {
      const item = mapPredictActivity({
        activity: entry,
        chainId: PREDICT_ACTIVITY_CHAIN_ID,
        quoteAsset: PREDICT_QUOTE_ASSET,
      });
      if (item) {
        result.push(item);
      }
    }
    return result;
  }, [activity]);

  const stableRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return {
    items,
    isLoading,
    error: error ? error.message : null,
    refetch: stableRefetch,
    loadMore,
    hasMore: Boolean(hasNextPage),
    isFetchingMore: isFetchingNextPage,
  };
}
