import { useCallback, useMemo } from 'react';
import type { ActivityListItem } from '../../../../../../util/activity-adapters';
import type { PredictVenueId } from '../../../types';
import type { PredictActivityItemsResult } from '../../usePredictActivityItems';
import { mapActivityEntry } from './mapActivityEntry';
import { useNextActivity } from './useNextActivity';
import { getVenueActivityChainId } from './venueActivityChainId';

const PREDICTION_KINDS: ReadonlySet<ActivityListItem['type']> = new Set([
  'predictionsAddFunds',
  'predictionsWithdrawFunds',
  'predictionPlaced',
  'predictionCashedOut',
  'predictionClaimWinnings',
  'predictionSettled',
]);

/**
 * The next Venue's canonical Activity as shared Activity items. Pages are
 * flattened in the backend's pinned order and deduplicated by the canonical
 * id, so a cursor boundary never repeats a row.
 *
 * @param options - Hook options.
 * @param options.venueId - The active next Venue, or `undefined` to stay idle.
 * @param options.enabled - Whether to read Activity.
 * @returns The list projection of the Venue's Activity.
 */
export const useNextActivityItems = ({
  venueId,
  enabled,
}: {
  venueId: PredictVenueId | undefined;
  enabled: boolean;
}): PredictActivityItemsResult => {
  const chainId = getVenueActivityChainId(venueId);
  const isEnabled = enabled && chainId !== undefined;
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    refetch,
  } = useNextActivity(venueId, isEnabled);

  const items = useMemo(() => {
    if (!chainId || !data) {
      return [];
    }
    const seen = new Set<string>();
    const result: ActivityListItem[] = [];
    for (const page of data.pages) {
      for (const entry of page.activity) {
        if (!seen.has(entry.id)) {
          seen.add(entry.id);
          result.push(mapActivityEntry(entry, chainId));
        }
      }
    }
    return result;
  }, [chainId, data]);

  const stableRefetch = useCallback(async () => {
    if (!isEnabled) return;
    await refetch();
  }, [isEnabled, refetch]);

  const loadMore = useCallback(async () => {
    if (!isEnabled || !hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isEnabled, isFetchingNextPage]);

  // Funding is a wallet transaction, never canonical Activity, so a Predict
  // row on another chain belongs to another Venue.
  const isInactiveVenueItem = useCallback(
    (item: ActivityListItem) =>
      PREDICTION_KINDS.has(item.type) && item.chainId !== chainId,
    [chainId],
  );

  return {
    items,
    isLoading: isEnabled && isPending,
    error: error ? error.message : null,
    refetch: stableRefetch,
    loadMore,
    hasMore: isEnabled && Boolean(hasNextPage),
    isFetchingMore: isFetchingNextPage,
    isInactiveVenueItem,
  };
};
