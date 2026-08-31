/**
 * Digest query freshness. React Query owns this; AiDigestController is a
 * passthrough and does not cache.
 */
export const DIGEST_QUERY_STALE_TIME_MS = 10 * 60 * 1000;
export const DIGEST_QUERY_GC_TIME_MS = DIGEST_QUERY_STALE_TIME_MS;

/**
 * 10-minute cache for a successful digest payload; 0 so a 404/`null` miss
 * does not block a later fetch.
 *
 * @param data - Cached query data.
 * @returns Cache duration in milliseconds.
 */
export const digestQueryCacheTimeMs = (data: unknown): number =>
  data ? DIGEST_QUERY_STALE_TIME_MS : 0;

/**
 * React Query `staleTime` / `gcTime` option. This app's installed types only
 * allow a number; the runtime accepts a function (TanStack Query 5.80+).
 */
export const digestQueryCacheTimeOption = ((query: {
  state: { data: unknown };
}) => digestQueryCacheTimeMs(query.state.data)) as unknown as number;
