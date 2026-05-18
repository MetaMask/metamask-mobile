/**
 * Centralised TanStack Query keys for the watchlist feature.
 *
 * Both query hooks and mutation hooks must use these constants so the
 * underlying cache stays in sync (e.g. add/remove mutations must invalidate
 * the same key the read query consumes).
 *
 * Tech spec: see "2.3 Hooks - TanStack Query" in
 * https://consensyssoftware.atlassian.net/wiki/spaces/TL1/pages/401467637802/WatchList+Tech+Spec+-+Technical+Breakdown+Tasks
 */
export const tokenWatchlistQueryKeys = {
  all: ['tokenWatchlist'] as const,
  blob: ['tokenWatchlist', 'blob'] as const,
  suggested: ['tokenWatchlist', 'suggested'] as const,
};
