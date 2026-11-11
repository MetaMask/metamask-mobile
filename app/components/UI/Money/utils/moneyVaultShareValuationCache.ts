import {
  array,
  enums,
  is,
  literal,
  number,
  optional,
  string,
  type,
} from '@metamask/superstruct';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import {
  getVaultShareValuationCacheIdentity,
  type VaultShareValuationCacheEntry,
} from './vaultShareValuations';

const CACHE_VERSION = 1;
const CACHE_KEY = `money.activity.vault-share-valuations.v${CACHE_VERSION}`;
export const VAULT_SHARE_VALUATION_CACHE_LIMIT = 500;

const CachedValuationStruct = type({
  type: enums(['transfer_in', 'transfer_out']),
  logIndex: optional(number()),
  blockNumber: number(),
  sharesWei: string(),
  assetsWei: string(),
  assetDecimals: number(),
});

const CachedEntryStruct = type({
  account: string(),
  chainId: number(),
  vaultAddress: string(),
  txHash: string(),
  valuations: array(CachedValuationStruct),
});

const CacheDocumentStruct = type({
  version: literal(CACHE_VERSION),
  entries: array(CachedEntryStruct),
});

function readEntries(): VaultShareValuationCacheEntry[] {
  try {
    const raw = StorageWrapper.getItemSync(CACHE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    return is(parsed, CacheDocumentStruct) ? parsed.entries : [];
  } catch {
    return [];
  }
}

export function readCachedVaultShareValuations(): VaultShareValuationCacheEntry[] {
  return readEntries();
}

function mergeEntries(
  current: readonly VaultShareValuationCacheEntry[],
  incoming: readonly VaultShareValuationCacheEntry[],
): VaultShareValuationCacheEntry[] {
  const byIdentity = new Map<string, VaultShareValuationCacheEntry>();
  for (const entry of current) {
    byIdentity.set(getVaultShareValuationCacheIdentity(entry), entry);
  }
  for (const entry of incoming) {
    byIdentity.set(getVaultShareValuationCacheIdentity(entry), entry);
  }
  return [...byIdentity.values()].slice(-VAULT_SHARE_VALUATION_CACHE_LIMIT);
}

async function persistEntries(
  entries: readonly VaultShareValuationCacheEntry[],
): Promise<void> {
  const merged = mergeEntries(readEntries(), entries);
  await StorageWrapper.setItem(
    CACHE_KEY,
    JSON.stringify({ version: CACHE_VERSION, entries: merged }),
  );
}

let writeQueue = Promise.resolve();

export function writeCachedVaultShareValuations(
  entries: readonly VaultShareValuationCacheEntry[],
): Promise<void> {
  const write = writeQueue.then(async () => {
    try {
      await persistEntries(entries);
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'money' },
        context: {
          name: 'moneyVaultShareValuationCache',
          data: { method: 'writeCachedVaultShareValuations' },
        },
      });
    }
  });
  writeQueue = write;
  return write;
}
