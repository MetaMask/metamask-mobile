/**
 * Digest query freshness. React Query owns this; AiDigestController is a
 * passthrough and does not cache.
 */
export const DIGEST_QUERY_STALE_TIME_MS = 10 * 60 * 1000;
export const DIGEST_QUERY_GC_TIME_MS = DIGEST_QUERY_STALE_TIME_MS;

/**
 * Dynamic `staleTime` so a successful digest payload stays fresh for 10
 * minutes, while a `null` 404 miss is immediately stale and retried on remount.
 *
 * `gcTime` stays a constant: unused queries are collected after 10 minutes.
 *
 * @param query - React Query cache entry.
 * @returns Stale time in milliseconds.
 */
export const digestQueryStaleTime = (query: {
  state: { data: unknown };
}): number => (query.state.data == null ? 0 : DIGEST_QUERY_STALE_TIME_MS);
