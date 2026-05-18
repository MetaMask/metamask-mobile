import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';

import {
  readFromTokenWatchList,
  type WatchlistBlob,
  writeToTokenWatchList,
} from '../storage';
import { createAsyncBatcher } from '../utils/createAsyncBatcher';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';

export type WatchlistUpdateListInput = CaipAssetType[];

interface WatchlistUpdateContext {
  prev: WatchlistBlob | undefined;
}

const normalizeList = (input: WatchlistUpdateListInput): string[] =>
  input.map((id) => String(id));

/**
 * Module-level batcher shared by every
 * {@link useTokenWatchlistUpdateListMutation} subscriber.
 *
 * Unlike the add/remove batchers, the update batcher uses a
 * "last-write-wins" semantic — when the user is dragging tokens around,
 * only the final ordering matters; intermediate orderings can be safely
 * dropped. The processor still reads the existing blob to preserve any
 * non-assets metadata (such as `version`) that the schema may evolve to
 * include.
 */
export const tokenWatchlistUpdateBatcher = createAsyncBatcher<
  string[],
  WatchlistBlob
>({
  processBatch: async (lists) => {
    const latest = lists[lists.length - 1];
    const current = await readFromTokenWatchList();
    const next: WatchlistBlob = {
      ...current,
      assets: latest,
    };
    await writeToTokenWatchList(next);
    return next;
  },
});

/**
 * Mutation hook that replaces the user's full watchlist ordering with a
 * new array of `CaipAssetType` ids. Designed for drag-and-drop
 * reordering surfaces.
 *
 * Behaviour:
 * - Optimistic update: the blob query cache is updated with the new ordering synchronously and rolled back on error.
 * - Async batching: while the user is dragging, multiple "new order" snapshots can fire in quick succession. They are coalesced into a single storage write through {@link tokenWatchlistUpdateBatcher}, with the latest ordering winning.
 * - Smart invalidation: only invalidates the blob query when the batcher is fully drained.
 */
export const useTokenWatchlistUpdateListMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<
    WatchlistBlob,
    Error,
    WatchlistUpdateListInput,
    WatchlistUpdateContext
  >({
    mutationFn: async (input) => {
      const next = normalizeList(input);
      return tokenWatchlistUpdateBatcher.submit(next);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
      const prev = queryClient.getQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
      );
      const next = normalizeList(input);
      queryClient.setQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
        (old) => ({
          ...(old ?? { assets: [], version: 1 }),
          assets: next,
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
      if (tokenWatchlistUpdateBatcher.isPending()) return;
      queryClient.invalidateQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
    },
  });
};
