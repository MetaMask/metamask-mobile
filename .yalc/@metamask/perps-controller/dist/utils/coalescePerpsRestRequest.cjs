"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPerpsRestCacheForTests = exports.coalescePerpsRestRequest = void 0;
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const inflight = new Map();
const cache = new Map();
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
function coalescePerpsRestRequest(key, fetcher, options = {}) {
    const ttlMs = options.ttlMs ?? perpsConfig_js_1.PERFORMANCE_CONFIG.PerpsRestCoalesceTtlMs;
    const forceRefresh = options.forceRefresh ?? false;
    if (forceRefresh) {
        cache.delete(key);
    }
    else {
        const now = Date.now();
        const cached = cache.get(key);
        if (cached) {
            if (cached.expiresAt > now) {
                return Promise.resolve(cached.value);
            }
            // Evict expired entry so callers with per-call-unique keys (e.g.
            // CandleStreamChannel historical paging with per-page endTime) do
            // not accumulate dead blobs for the life of the process.
            cache.delete(key);
        }
        const existing = inflight.get(key);
        if (existing !== undefined) {
            return existing;
        }
    }
    const run = fetcher().then((value) => {
        // Only the currently-tracked in-flight promise writes to cache. A stale
        // in-flight (e.g. one that was racing a later forceRefresh=true caller)
        // must not clobber the fresh value once it finally resolves.
        if (inflight.get(key) === run) {
            cache.set(key, { value, expiresAt: Date.now() + ttlMs });
            inflight.delete(key);
        }
        return value;
    }, (error) => {
        if (inflight.get(key) === run) {
            inflight.delete(key);
        }
        throw error;
    });
    inflight.set(key, run);
    return run;
}
exports.coalescePerpsRestRequest = coalescePerpsRestRequest;
/**
 * Test-only: wipe all cached entries and in-flight promises.
 */
function resetPerpsRestCacheForTests() {
    cache.clear();
    inflight.clear();
}
exports.resetPerpsRestCacheForTests = resetPerpsRestCacheForTests;
//# sourceMappingURL=coalescePerpsRestRequest.cjs.map