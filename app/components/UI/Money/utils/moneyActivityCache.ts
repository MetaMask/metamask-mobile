import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import { DAY } from '../../../../constants/time';

/**
 * Disk cache for the first page of Money account activity.
 *
 * The React Query cache is memory-only, so it dies with the JS context. On
 * Android — where the process is reclaimed far more aggressively than on iOS —
 * that means most Money Home opens start cold and block on a network round-trip
 * before any activity renders. Persisting just the first page lets that render
 * come off disk while React Query revalidates in the background.
 *
 * Only page one is stored: it is the page that gates time-to-content, and
 * keeping the cache to a single page bounds what we write per account.
 */

const CACHE_VERSION = 1;
const CACHE_TTL_MS = DAY;

interface CachedFirstPage {
  page: V1AccountTransactionsResponse;
  cachedAt: number;
}

function cacheKey(address: string): string {
  return `money.activity.page1.v${CACHE_VERSION}.${address.toLowerCase()}`;
}

function isCachedFirstPage(value: unknown): value is CachedFirstPage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<CachedFirstPage>;
  return (
    typeof candidate.cachedAt === 'number' &&
    typeof candidate.page === 'object' &&
    candidate.page !== null
  );
}

/**
 * Reads the cached first page for `address`, or `undefined` when there is no
 * usable entry. Synchronous (MMKV) so a caller can seed React Query during
 * render without an async hydration gate.
 *
 * @param address - Checksummed money account address.
 * @returns The cached page and the time it was written, if still within TTL.
 */
export function readCachedFirstPage(
  address: string,
): CachedFirstPage | undefined {
  if (!address) {
    return undefined;
  }

  try {
    const raw = StorageWrapper.getItemSync(cacheKey(address));
    if (!raw) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isCachedFirstPage(parsed)) {
      return undefined;
    }

    // A clock change can put `cachedAt` in the future; treat that as unusable
    // rather than trusting it forever.
    const age = Date.now() - parsed.cachedAt;
    if (age < 0 || age > CACHE_TTL_MS) {
      return undefined;
    }

    return parsed;
  } catch {
    // A corrupt or unparseable entry is not worth surfacing — the caller
    // simply falls back to fetching.
    return undefined;
  }
}

/**
 * Persists `page` as the cached first page for `address`. Fire-and-forget: a
 * write failure only costs the next cold start its head start.
 *
 * @param address - Checksummed money account address.
 * @param page - The first-page response to cache.
 */
export function writeCachedFirstPage(
  address: string,
  page: V1AccountTransactionsResponse,
): void {
  if (!address) {
    return;
  }

  const entry: CachedFirstPage = { page, cachedAt: Date.now() };

  StorageWrapper.setItem(cacheKey(address), JSON.stringify(entry)).catch(
    (error) => {
      Logger.error(error as Error, {
        tags: { feature: 'money' },
        context: {
          name: 'moneyActivityCache',
          data: { method: 'writeCachedFirstPage' },
        },
      });
    },
  );
}
