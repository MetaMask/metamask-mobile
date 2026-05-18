import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';

import {
  EMPTY_BLOB,
  readFromTokenWatchList,
  type WatchlistBlob,
  writeToTokenWatchList,
} from '../storage';
import { createAsyncBatcher } from '../utils/createAsyncBatcher';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';

export type WatchlistRemoveInput = CaipAssetType | CaipAssetType[];

interface WatchlistRemoveContext {
  prev: WatchlistBlob | undefined;
}

const normalizeInput = (input: WatchlistRemoveInput): string[] =>
  (Array.isArray(input) ? input : [input]).map((id) => String(id));

const filterAssets = (
  base: readonly string[],
  removals: readonly string[],
): string[] => {
  const removalSet = new Set(removals);
  return base.filter((id) => !removalSet.has(id));
};

/**
 * Module-level batcher shared by every
 * {@link useTokenWatchlistRemoveItemMutation} subscriber. See
 * {@link tokenWatchlistAddBatcher} for the rationale.
 */
export const tokenWatchlistRemoveBatcher = createAsyncBatcher<
  string,
  WatchlistBlob
>({
  processBatch: async (ids) => {
    const current = await readFromTokenWatchList();
    const next: WatchlistBlob = {
      ...current,
      assets: filterAssets(current.assets, ids),
    };
    await writeToTokenWatchList(next);
    return next;
  },
});

/**
 * Mutation hook that removes one or more `CaipAssetType` ids from the
 * user's watchlist.
 *
 * Mirrors {@link useTokenWatchlistAddItemMutation}:
 * - Optimistic update: filters out the removed ids from the cached blob synchronously in `onMutate` and rolls back on error.
 * - Async batching: removals are funnelled through {@link tokenWatchlistRemoveBatcher} so bursts of "unstar" taps collapse into a single storage write.
 * - Smart invalidation: only invalidates the blob query when the batcher has finished draining.
 */
export const useTokenWatchlistRemoveItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    WatchlistBlob,
    Error,
    WatchlistRemoveInput,
    WatchlistRemoveContext
  >({
    mutationFn: async (input) => {
      const ids = normalizeInput(input);
      const results = await Promise.all(
        ids.map((id) => tokenWatchlistRemoveBatcher.submit(id)),
      );
      return results[results.length - 1];
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
      const prev = queryClient.getQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
      );
      const ids = normalizeInput(input);
      queryClient.setQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
        (old) => ({
          assets: filterAssets((old ?? EMPTY_BLOB).assets, ids),
          version: 1,
        }),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(tokenWatchlistQueryKeys.blob, ctx.prev);
      }
    },
    onSettled: () => {
      if (tokenWatchlistRemoveBatcher.isPending()) return;
      queryClient.invalidateQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
    },
  });
};
