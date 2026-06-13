/**
 * Centralised TanStack Query keys for the token watchlist feature.
 *
 * Exporting these constants keeps test cases and call sites in sync, and
 * lets the mutation hooks reliably target the same query that the
 * `useTokenWatchlistQuery` hook subscribes to.
 */
export const tokenWatchlistQueryKeys = {
  all: ['tokenWatchlist'] as const,
  blob: ['tokenWatchlist', 'blob'] as const,
  suggested: ['tokenWatchlist', 'suggested'] as const,
};
