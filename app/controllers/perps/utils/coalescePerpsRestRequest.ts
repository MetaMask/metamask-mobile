import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';

// Rapid perps market switching (candle bridge + activity tab burst) drives
// duplicate REST calls against api.hyperliquid.xyz and occasionally trips 429.
// This helper collapses concurrent identical calls into one in-flight promise
// and serves a short TTL cache to absorb the burst. Explicit refresh bypasses
// the cache so user-initiated refetch still re-runs.
//
// Lives at the service layer (MarketDataService) rather than per-hook so every
// current and future caller — hooks, controller, aggregated provider — is
// deduped automatically. Mirrors the intent of metamask-extension PR #41917
// activity-page dedup; mobile implementation is centralized instead of
// scattered because MarketDataService is already a single choke point.

type CacheEntry<TValue> = {
  value: TValue;
  expiresAt: number;
}

const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, CacheEntry<unknown>>();

export type CoalesceOptions = {
  /**
   * Cache TTL in milliseconds. Defaults to
   * {@link PERFORMANCE_CONFIG.PerpsRestCoalesceTtlMs}.
   */
  ttlMs?: number;
  /**
   * Bypass the cache and any in-flight promise. The fresh result will be
   * written back to the cache under the same key.
   */
  forceRefresh?: boolean;
}

/**
 * Coalesce an idempotent perps REST call.
 *
 * - If a fresh cached value exists for `key`, it is returned immediately.
 * - If an in-flight promise exists for `key`, it is shared with the caller.
 * - Otherwise, `fetcher` runs once; the result populates the cache for `ttlMs`.
 *
 * `forceRefresh` skips both cache and in-flight dedup.
 *
 * @param key - Stable cache key identifying this logical REST call.
 * @param fetcher - Thunk that performs the REST call when no cache/inflight hit.
 * @param options - Optional overrides for TTL and forceRefresh behavior.
 * @returns The fetched (or cached) value.
 */
export function coalescePerpsRestRequest<TValue>(
  key: string,
  fetcher: () => Promise<TValue>,
  options: CoalesceOptions = {},
): Promise<TValue> {
  const ttlMs = options.ttlMs ?? PERFORMANCE_CONFIG.PerpsRestCoalesceTtlMs;
  const forceRefresh = options.forceRefresh ?? false;

  if (forceRefresh) {
    cache.delete(key);
  } else {
    const now = Date.now();
    const cached = cache.get(key) as CacheEntry<TValue> | undefined;
    if (cached && cached.expiresAt > now) {
      return Promise.resolve(cached.value);
    }
    const existing = inflight.get(key) as Promise<TValue> | undefined;
    if (existing !== undefined) {
      return existing;
    }
  }

  const run = fetcher().then(
    (value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      if (inflight.get(key) === run) {
        inflight.delete(key);
      }
      return value;
    },
    (error) => {
      if (inflight.get(key) === run) {
        inflight.delete(key);
      }
      throw error;
    },
  );

  inflight.set(key, run);
  return run;
}

/**
 * Drop the cached value for `key`. The in-flight promise (if any) is left
 * alone so an already-running call still completes and refreshes the cache.
 * Call this when an explicit user action should bypass the TTL.
 *
 * @param key - Cache key whose value should be evicted.
 */
export function invalidatePerpsRestCache(key: string): void {
  cache.delete(key);
}

/**
 * Test-only: wipe all cached entries and in-flight promises.
 */
export function resetPerpsRestCacheForTests(): void {
  cache.clear();
  inflight.clear();
}
