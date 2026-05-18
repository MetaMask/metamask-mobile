import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';

import {
  EMPTY_BLOB,
  readFromTokenWatchList,
  type WatchlistBlob,
  writeToTokenWatchList,
} from '../storage';
import {
  type AsyncBatcher,
  createAsyncBatcher,
} from '../utils/createAsyncBatcher';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';

export type WatchlistAddInput = CaipAssetType | CaipAssetType[];
export type WatchlistRemoveInput = CaipAssetType | CaipAssetType[];
export type WatchlistUpdateListInput = CaipAssetType[];

interface WatchlistMutationContext {
  prev: WatchlistBlob | undefined;
}

const toStrings = (input: readonly CaipAssetType[]): string[] =>
  input.map((id) => String(id));

const asArray = <T>(value: T | T[]): T[] =>
  Array.isArray(value) ? value : [value];

const mergeAssets = (
  base: readonly string[],
  additions: readonly string[],
): string[] => Array.from(new Set([...base, ...additions]));

const filterAssets = (
  base: readonly string[],
  removals: readonly string[],
): string[] => {
  const remove = new Set(removals);
  return base.filter((id) => !remove.has(id));
};

/**
 * Module-level batcher for add operations. Shared across every
 * subscriber so concurrent taps from different components collapse into
 * a single read-modify-write pass against storage, as required by
 * section 2.3 of the WatchList tech spec.
 *
 * Exported so tests can `cancel()` between runs; production callers
 * should treat it as private.
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
 * Module-level batcher for remove operations. See {@link tokenWatchlistAddBatcher}.
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
 * Module-level batcher for full-list reorder operations. Uses last-write-wins
 * semantics: while the user is dragging tokens around only the final
 * ordering matters, so intermediate orderings are dropped.
 */
export const tokenWatchlistUpdateBatcher = createAsyncBatcher<
  string[],
  WatchlistBlob
>({
  processBatch: async (lists) => {
    const latest = lists[lists.length - 1];
    const current = await readFromTokenWatchList();
    const next: WatchlistBlob = { ...current, assets: latest };
    await writeToTokenWatchList(next);
    return next;
  },
});

const useWatchlistMutation = <TInput>({
  batcher,
  applyOptimistic,
  submit,
}: {
  batcher: AsyncBatcher<unknown, WatchlistBlob>;
  applyOptimistic: (current: readonly string[], input: TInput) => string[];
  submit: (input: TInput) => Promise<WatchlistBlob>;
}) => {
  const queryClient = useQueryClient();

  return useMutation<WatchlistBlob, Error, TInput, WatchlistMutationContext>({
    mutationFn: submit,
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
      const prev = queryClient.getQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
      );
      queryClient.setQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
        (old) => ({
          assets: applyOptimistic((old ?? EMPTY_BLOB).assets, input),
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
      if (batcher.isPending()) return;
      queryClient.invalidateQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
    },
  });
};

/**
 * Append one or more `CaipAssetType` ids to the watchlist. Performs
 * optimistic cache updates with rollback, and routes the actual storage
 * write through {@link tokenWatchlistAddBatcher} so bursts of taps
 * collapse into a single read-modify-write.
 */
export const useTokenWatchlistAddItemMutation = () =>
  useWatchlistMutation<WatchlistAddInput>({
    batcher: tokenWatchlistAddBatcher as AsyncBatcher<unknown, WatchlistBlob>,
    applyOptimistic: (current, input) =>
      mergeAssets(current, toStrings(asArray(input))),
    submit: async (input) => {
      const ids = toStrings(asArray(input));
      const results = await Promise.all(
        ids.map((id) => tokenWatchlistAddBatcher.submit(id)),
      );
      return results[results.length - 1];
    },
  });

/**
 * Remove one or more `CaipAssetType` ids from the watchlist. Mirrors
 * {@link useTokenWatchlistAddItemMutation} but filters instead of
 * appending.
 */
export const useTokenWatchlistRemoveItemMutation = () =>
  useWatchlistMutation<WatchlistRemoveInput>({
    batcher: tokenWatchlistRemoveBatcher as AsyncBatcher<
      unknown,
      WatchlistBlob
    >,
    applyOptimistic: (current, input) =>
      filterAssets(current, toStrings(asArray(input))),
    submit: async (input) => {
      const ids = toStrings(asArray(input));
      const results = await Promise.all(
        ids.map((id) => tokenWatchlistRemoveBatcher.submit(id)),
      );
      return results[results.length - 1];
    },
  });

/**
 * Replace the user's full watchlist ordering with a new array of
 * `CaipAssetType` ids. Intended for drag-and-drop reordering surfaces;
 * uses last-write-wins batching so rapid drag updates collapse into a
 * single storage write.
 */
export const useTokenWatchlistUpdateListMutation = () =>
  useWatchlistMutation<WatchlistUpdateListInput>({
    batcher: tokenWatchlistUpdateBatcher as AsyncBatcher<
      unknown,
      WatchlistBlob
    >,
    applyOptimistic: (_current, input) => toStrings(input),
    submit: (input) => tokenWatchlistUpdateBatcher.submit(toStrings(input)),
  });
