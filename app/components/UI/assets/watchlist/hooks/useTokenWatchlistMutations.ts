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
export type WatchlistRemoveInput = CaipAssetType | CaipAssetType[];
export type WatchlistUpdateListInput = CaipAssetType[];

/**
 * Discriminated-union op fed into the shared {@link tokenWatchlistBatcher}.
 * Every mutation hook tags its interaction with one of these so the
 * batcher can reduce add/remove/replace operations against the same
 * blob snapshot in submission order.
 */
export type WatchlistOp =
  | { kind: 'add'; ids: string[] }
  | { kind: 'remove'; ids: string[] }
  | { kind: 'replace'; list: string[] };

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

const applyOp = (acc: string[], op: WatchlistOp): string[] => {
  switch (op.kind) {
    case 'add':
      return mergeAssets(acc, op.ids);
    case 'remove':
      return filterAssets(acc, op.ids);
    case 'replace':
      return [...op.list];
  }
};

/**
 * Single module-level batcher shared by every watchlist mutation hook. On a trailing-edge flush the processor reads the persisted blob once, folds every accumulated op against it in submission order, and writes the result back. This lets a burst of taps from different hooks collapse into a single read-modify-write, lets a toggle (add A then remove A) within the debounce window cancel out naturally, and lets a drag-and-drop `replace` overwrite any add/remove ops submitted before it in the same batch.
 */
export const tokenWatchlistBatcher = createAsyncBatcher<WatchlistOp>(
  async (ops) => {
    const current = await readFromTokenWatchList();
    await writeToTokenWatchList({
      ...current,
      assets: ops.reduce<string[]>(applyOp, [...current.assets]),
    });
  },
);

const useWatchlistMutation = <TInput>({
  applyOptimistic,
  toOp,
}: {
  applyOptimistic: (current: readonly string[], input: TInput) => string[];
  toOp: (input: TInput) => WatchlistOp;
}) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, TInput, WatchlistMutationContext>({
    mutationFn: (input) => tokenWatchlistBatcher.submit(toOp(input)),
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
      queryClient.invalidateQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
    },
  });
};

/**
 * Append one or more `CaipAssetType` ids to the watchlist. Performs
 * optimistic cache updates with rollback and enqueues an `add` op into
 * the shared {@link tokenWatchlistBatcher}.
 */
export const useTokenWatchlistAddItemMutation = () =>
  useWatchlistMutation<WatchlistAddInput>({
    applyOptimistic: (current, input) =>
      mergeAssets(current, toStrings(asArray(input))),
    toOp: (input) => ({ kind: 'add', ids: toStrings(asArray(input)) }),
  });

/**
 * Remove one or more `CaipAssetType` ids from the watchlist. Mirrors
 * {@link useTokenWatchlistAddItemMutation} but enqueues a `remove` op.
 */
export const useTokenWatchlistRemoveItemMutation = () =>
  useWatchlistMutation<WatchlistRemoveInput>({
    applyOptimistic: (current, input) =>
      filterAssets(current, toStrings(asArray(input))),
    toOp: (input) => ({ kind: 'remove', ids: toStrings(asArray(input)) }),
  });

/**
 * Replace the user's full watchlist ordering. Intended for drag-and-drop
 * reordering surfaces; the enqueued `replace` op overwrites any
 * add/remove ops that landed before it in the same batch.
 */
export const useTokenWatchlistUpdateListMutation = () =>
  useWatchlistMutation<WatchlistUpdateListInput>({
    applyOptimistic: (_current, input) => toStrings(input),
    toOp: (input) => ({ kind: 'replace', list: toStrings(input) }),
  });
