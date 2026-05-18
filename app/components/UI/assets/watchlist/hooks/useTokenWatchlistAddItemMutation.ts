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

export type WatchlistAddInput = CaipAssetType | CaipAssetType[];

interface WatchlistAddContext {
  prev: WatchlistBlob | undefined;
}

const normalizeInput = (input: WatchlistAddInput): string[] =>
  (Array.isArray(input) ? input : [input]).map((id) => String(id));

const mergeAssets = (
  base: readonly string[],
  additions: readonly string[],
): string[] => Array.from(new Set([...base, ...additions]));

/**
 * Module-level batcher shared by every {@link useTokenWatchlistAddItemMutation}
 * subscriber. Coalescing add operations across components keeps the
 * underlying read-modify-write against storage to a single round-trip
 * per user "burst" of interactions, which is the optimisation called
 * out in section 2.3 of the WatchList tech spec.
 *
 * Exported for tests so they can `cancel()` between runs to avoid
 * cross-test leakage; production callers should treat this as a private
 * implementation detail.
 */
export const tokenWatchlistAddBatcher = createAsyncBatcher<
  string,
  WatchlistBlob
>({
  processBatch: async (ids) => {
    const current = await readFromTokenWatchList();
    const next: WatchlistBlob = {
      ...current,
      assets: mergeAssets(current.assets, ids),
    };
    await writeToTokenWatchList(next);
    return next;
  },
});

/**
 * Mutation hook that appends one or more `CaipAssetType` ids to the
 * user's watchlist.
 *
 * Behaviour:
 * - Optimistic update: the watchlist blob query cache is updated synchronously in `onMutate` so the UI reflects the new state immediately. A snapshot of the previous cache value is returned in the mutation context and restored from `onError` if the underlying write fails.
 * - Async batching: all add operations from every subscriber funnel through {@link tokenWatchlistAddBatcher}, collapsing rapid taps into a single read-modify-write pass.
 * - Smart invalidation: the blob query is only invalidated once the batcher is fully drained, avoiding mid-burst refetches that would clobber pending optimistic state.
 */
export const useTokenWatchlistAddItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    WatchlistBlob,
    Error,
    WatchlistAddInput,
    WatchlistAddContext
  >({
    mutationFn: async (input) => {
      const ids = normalizeInput(input);
      const results = await Promise.all(
        ids.map((id) => tokenWatchlistAddBatcher.submit(id)),
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
          assets: mergeAssets((old ?? EMPTY_BLOB).assets, ids),
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
      if (tokenWatchlistAddBatcher.isPending()) return;
      queryClient.invalidateQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
    },
  });
};
