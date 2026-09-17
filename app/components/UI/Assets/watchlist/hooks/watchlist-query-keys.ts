export const tokenWatchlistQueryKeys = {
  all: ['tokenWatchlist'] as const,
  blob: ['tokenWatchlist', 'blob'] as const,
  hydrated: ['tokenWatchlist', 'hydrated'] as const,
  /** Prefix shared by every suggested-pool key; for partial cache matching. */
  suggestedAll: ['tokenWatchlist', 'suggested'] as const,
  suggested: (includeSpaceX: boolean) =>
    [
      'tokenWatchlist',
      'suggested',
      includeSpaceX ? 'with-spacex' : 'base',
    ] as const,
};
