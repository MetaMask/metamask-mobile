import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';

import { EMPTY_BLOB, type WatchlistBlob } from '../storage';
import {
  useTokenWatchlistAddItemMutation,
  useTokenWatchlistRemoveItemMutation,
} from './useTokenWatchlistMutations';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';

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
 *
 * NOTE: Once PR #30338 merges, refactor to use `useTokenWatchlistQuery`
 * for full hydration instead of the raw blob query.
 */
export function useTokenWatchlist(
  assetId: CaipAssetType | null,
): UseTokenWatchlistResult {
  const queryClient = useQueryClient();
  const addMutation = useTokenWatchlistAddItemMutation();
  const removeMutation = useTokenWatchlistRemoveItemMutation();

  const { data: blob } = useQuery<WatchlistBlob>({
    queryKey: tokenWatchlistQueryKeys.blob,
    queryFn: () =>
      queryClient.getQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob) ??
      EMPTY_BLOB,
    staleTime: Infinity,
  });

  const assetIdStr = assetId ? String(assetId) : null;
  const isWatched = assetIdStr
    ? (blob?.assets.includes(assetIdStr) ?? false)
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
