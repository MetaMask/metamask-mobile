import { useCallback } from 'react';
import type { CaipAssetType } from '@metamask/utils';

import {
  useTokenWatchlistAddItemMutation,
  useTokenWatchlistRemoveItemMutation,
} from './useTokenWatchlistMutations';
import { useTokenWatchlistAssetIds } from './useTokenWatchlistAssetIds';

export interface UseTokenWatchlistResult {
  isWatched: boolean;
  isLoading: boolean;
  toggle: () => void;
}

const NOOP_RESULT: UseTokenWatchlistResult = {
  isWatched: false,
  isLoading: false,
  toggle: () => undefined,
};

/**
 * Convenience hook that exposes `isWatched` and a `toggle` function for a
 * single asset. Combines the add/remove mutation hooks with a reactive
 * cache subscription via useQuery so optimistic updates are reflected
 * immediately.
 */
export function useTokenWatchlist(
  assetId: CaipAssetType | null,
): UseTokenWatchlistResult {
  const addMutation = useTokenWatchlistAddItemMutation();
  const removeMutation = useTokenWatchlistRemoveItemMutation();

  const watchlistAssetIds = useTokenWatchlistAssetIds();
  const assetIdStr = assetId ? String(assetId) : null;
  const normalizedAssetId = assetIdStr?.toLowerCase() ?? null;
  const isWatched = normalizedAssetId
    ? watchlistAssetIds.some((id) => id.toLowerCase() === normalizedAssetId)
    : false;

  const isLoading = addMutation.isPending || removeMutation.isPending;

  const toggle = useCallback(() => {
    if (!assetId) return;
    if (isWatched) {
      removeMutation.mutate(assetId);
    } else {
      addMutation.mutate(assetId);
    }
  }, [assetId, isWatched, addMutation, removeMutation]);

  if (!assetId) {
    return NOOP_RESULT;
  }

  return { isWatched, isLoading, toggle };
}
