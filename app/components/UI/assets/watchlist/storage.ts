import {
  array,
  create,
  defaulted,
  type Infer,
  literal,
  object,
  string,
} from '@metamask/superstruct';

import StorageWrapper from '../../../../store/storage-wrapper';

export const WATCHLIST_STORAGE_PATH = 'watchlistV1.tokens';

const WatchlistBlobSchema = object({
  assets: defaulted(array(string()), () => []),
  version: defaulted(literal(1), () => 1 as const),
});

export type WatchlistBlob = Infer<typeof WatchlistBlobSchema>;

export const EMPTY_BLOB: WatchlistBlob = { assets: [], version: 1 };

/**
 * Read the watchlist blob from local device storage.
 *
 * The raw value is parsed through {@link WatchlistBlobSchema} before it is
 * returned, so callers can rely on the shape (and the schema-applied
 * defaults) of the result.
 *
 * NOTE: This is a temporary local-storage backed implementation. Once the
 * Account Universal Storage (AUS) SDK is ready, swap the body of this
 * function to delegate to the SDK while preserving the same signature and
 * validation contract.
 */
export async function readFromTokenWatchList(): Promise<WatchlistBlob> {
  const raw = await StorageWrapper.getItem(WATCHLIST_STORAGE_PATH);
  if (!raw) return EMPTY_BLOB;
  return create(JSON.parse(raw), WatchlistBlobSchema);
}

/**
 * Write the watchlist blob to local device storage.
 *
 * The input blob is validated against {@link WatchlistBlobSchema} before it
 * is serialized and persisted, guaranteeing that only well-formed data ever
 * reaches storage.
 *
 * NOTE: This is a temporary local-storage backed implementation. Once the
 * Account Universal Storage (AUS) SDK is ready, swap the body of this
 * function to delegate to the SDK while preserving the same signature and
 * validation contract.
 */
export async function writeToTokenWatchList(
  blob: WatchlistBlob,
): Promise<void> {
  const validated = create(blob, WatchlistBlobSchema);
  await StorageWrapper.setItem(
    WATCHLIST_STORAGE_PATH,
    JSON.stringify(validated),
  );
}
