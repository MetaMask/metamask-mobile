import StorageWrapper from '../../../store/storage-wrapper';

const WATCHLIST_ORDER_STORAGE_PREFIX = '@MetaMask:watchlistOrder:';
const WATCHLIST_ORDER_STORAGE_VERSION = 1;

interface WatchlistOrderStoragePayload {
  version: typeof WATCHLIST_ORDER_STORAGE_VERSION;
  keys: string[];
}

const getStorageKey = (accountGroupId: string | null): string =>
  `${WATCHLIST_ORDER_STORAGE_PREFIX}${encodeURIComponent(
    accountGroupId ?? 'default',
  )}`;

const normalizeOrder = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new Error('Invalid watchlist order payload');
  }

  return Array.from(
    new Set(
      value.filter(
        (key): key is string => typeof key === 'string' && key.length > 0,
      ),
    ),
  );
};

const parseOrder = (value: string | null | undefined): string[] => {
  if (value == null) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    // Presentation order is recoverable state. A malformed payload must not
    // block the watchlist; the next successful write replaces it.
    return [];
  }

  if (Array.isArray(parsed)) {
    return normalizeOrder(parsed);
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    parsed.version === WATCHLIST_ORDER_STORAGE_VERSION &&
    'keys' in parsed
  ) {
    return Array.isArray(parsed.keys) ? normalizeOrder(parsed.keys) : [];
  }

  return [];
};

export const readWatchlistOrder = async (
  accountGroupId: string | null,
): Promise<string[]> =>
  parseOrder(await StorageWrapper.getItem(getStorageKey(accountGroupId)));

export const writeWatchlistOrder = async (
  accountGroupId: string | null,
  order: readonly string[],
): Promise<void> => {
  const payload: WatchlistOrderStoragePayload = {
    version: WATCHLIST_ORDER_STORAGE_VERSION,
    keys: normalizeOrder(order),
  };

  await StorageWrapper.setItem(
    getStorageKey(accountGroupId),
    JSON.stringify(payload),
  );
};
