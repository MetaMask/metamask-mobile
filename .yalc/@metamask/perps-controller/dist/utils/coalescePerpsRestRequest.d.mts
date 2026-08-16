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
};
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
export declare function coalescePerpsRestRequest<TValue>(key: string, fetcher: () => Promise<TValue>, options?: CoalesceOptions): Promise<TValue>;
/**
 * Test-only: wipe all cached entries and in-flight promises.
 */
export declare function resetPerpsRestCacheForTests(): void;
//# sourceMappingURL=coalescePerpsRestRequest.d.mts.map