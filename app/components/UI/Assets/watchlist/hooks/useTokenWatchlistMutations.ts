import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';

import {
  EMPTY_BLOB,
  readFromTokenWatchList,
  type WatchlistBlob,
  writeToTokenWatchList,
} from '../storage';
import { createAsyncBatcher } from '../utils/createAsyncBatcher';
import type { WatchlistTokenMetadata } from '../utils/getTokens';
import { tokenWatchlistQueryKeys } from './watchlist-query-keys';

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
  prevBlob: WatchlistBlob | undefined;
  prevHydrated: WatchlistTokenMetadata[] | undefined;
}

const toStrings = (input: readonly CaipAssetType[]): string[] =>
  input.map(String);

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
  const removeLower = new Set(removals.map((id) => id.toLowerCase()));
  return base.filter((id) => !removeLower.has(id.toLowerCase()));
};

/**
 * Blob cache is only populated when `useTokenWatchlist` is mounted (e.g. TDP
 * star). List surfaces use the hydrated query alone, so fall back to hydrated
 * asset IDs when the blob cache has never been read.
 */
const resolveOptimisticBaseAssets = (
  prevBlob: WatchlistBlob | undefined,
  prevHydrated: WatchlistTokenMetadata[] | undefined,
): readonly string[] => {
  if (prevBlob !== undefined) {
    return prevBlob.assets;
  }
  if (prevHydrated !== undefined && prevHydrated.length > 0) {
    return prevHydrated.map((token) => String(token.assetId));
  }
  return EMPTY_BLOB.assets;
};

/**
 * Reconcile the hydrated token list against the optimistically updated blob
 * IDs. Removes dropped IDs immediately and reorders survivors to match the
 * blob. IDs not yet present in the hydrated cache (e.g. a freshly added
 * asset before `getTokens` resolves) are omitted until the settled refetch.
 */
const applyOptimisticToHydrated = (
  hydrated: WatchlistTokenMetadata[] | undefined,
  newAssetIds: readonly string[],
): WatchlistTokenMetadata[] | undefined => {
  if (hydrated === undefined) {
    return undefined;
  }

  const byId = new Map(
    hydrated.map((token) => [String(token.assetId).toLowerCase(), token]),
  );

  return newAssetIds
    .map((id) => byId.get(id.toLowerCase()))
    .filter((token): token is WatchlistTokenMetadata => token !== undefined);
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
      assets: ops.reduce<string[]>(
        (acc, op) => applyOp(acc, op),
        [...current.assets],
      ),
    });
  },
);

interface InvalidateOnSettledOptions {
  /** Refetch the ID blob from storage. Defaults to true. */
  blob?: boolean;
  /** Refetch enriched tokens via the Token API. Defaults to true. */
  hydrated?: boolean;
}

const useWatchlistMutation = <TInput>({
  applyOptimistic,
  toOp,
  invalidateOnSettled = { blob: true, hydrated: true },
}: {
  applyOptimistic: (current: readonly string[], input: TInput) => string[];
  toOp: (input: TInput) => WatchlistOp;
  invalidateOnSettled?: InvalidateOnSettledOptions;
}) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, TInput, WatchlistMutationContext>({
    mutationFn: (input) => tokenWatchlistBatcher.submit(toOp(input)),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: tokenWatchlistQueryKeys.blob,
      });
      await queryClient.cancelQueries({
        queryKey: tokenWatchlistQueryKeys.hydrated,
      });

      const prevBlob = queryClient.getQueryData<WatchlistBlob>(
        tokenWatchlistQueryKeys.blob,
      );
      const prevHydrated = queryClient.getQueryData<WatchlistTokenMetadata[]>(
        tokenWatchlistQueryKeys.hydrated,
      );
      const nextAssets = applyOptimistic(
        resolveOptimisticBaseAssets(prevBlob, prevHydrated),
        input,
      );

      queryClient.setQueryData<WatchlistBlob>(tokenWatchlistQueryKeys.blob, {
        assets: nextAssets,
        version: 1,
      });
      queryClient.setQueryData<WatchlistTokenMetadata[]>(
        tokenWatchlistQueryKeys.hydrated,
        (old) => applyOptimisticToHydrated(old, nextAssets) ?? old,
      );

      return { prevBlob, prevHydrated };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevBlob !== undefined) {
        queryClient.setQueryData(tokenWatchlistQueryKeys.blob, ctx.prevBlob);
      }
      if (ctx?.prevHydrated !== undefined) {
        queryClient.setQueryData(
          tokenWatchlistQueryKeys.hydrated,
          ctx.prevHydrated,
        );
      }
    },
    onSettled: () => {
      if (invalidateOnSettled.blob !== false) {
        queryClient.invalidateQueries({
          queryKey: tokenWatchlistQueryKeys.blob,
        });
      }
      if (invalidateOnSettled.hydrated !== false) {
        queryClient.invalidateQueries({
          queryKey: tokenWatchlistQueryKeys.hydrated,
        });
      }
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
    // Blob is already correct after onMutate; hydrated needs getTokens for metadata.
    invalidateOnSettled: { blob: false, hydrated: true },
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
    // Optimistic blob + hydrated updates are sufficient; no Token API refetch.
    invalidateOnSettled: { blob: false, hydrated: false },
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
    // Reorder only shuffles cached metadata; no Token API refetch.
    invalidateOnSettled: { blob: false, hydrated: false },
  });
