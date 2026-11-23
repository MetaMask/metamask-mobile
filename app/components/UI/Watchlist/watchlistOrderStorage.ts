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

  const parsed: unknown = JSON.parse(value);
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
    return normalizeOrder(parsed.keys);
  }

  throw new Error('Unsupported watchlist order payload');
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
