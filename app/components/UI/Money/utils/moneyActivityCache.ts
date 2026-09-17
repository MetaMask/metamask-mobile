import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import StorageWrapper from '../../../../store/storage-wrapper';
import Logger from '../../../../util/Logger';
import { DAY } from '../../../../constants/time';

/**
 * Disk cache for the first page of Money account activity: the React Query
 * cache is memory-only, and Android reclaims the process aggressively enough
 * that most Money Home opens would otherwise block on the network. Page one
 * is the page that gates time-to-content.
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
 * Synchronous (MMKV) so a caller can seed React Query during render without an
 * async hydration gate.
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

    // A clock change can stamp `cachedAt` in the future — never trust it.
    const age = Date.now() - parsed.cachedAt;
    if (age < 0 || age > CACHE_TTL_MS) {
      return undefined;
    }

    return parsed;
  } catch {
    // A corrupt entry is not worth surfacing — the caller falls back to fetching.
    return undefined;
  }
}

/**
 * Fire-and-forget: a write failure only costs the next cold start its head start.
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
