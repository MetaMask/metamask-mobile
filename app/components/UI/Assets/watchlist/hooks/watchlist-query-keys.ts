export const tokenWatchlistQueryKeys = {
  all: ['tokenWatchlist'] as const,
  blob: ['tokenWatchlist', 'blob'] as const,
  hydrated: ['tokenWatchlist', 'hydrated'] as const,
  suggested: (includeSpaceX: boolean) =>
    [
      'tokenWatchlist',
      'suggested',
      includeSpaceX ? 'with-spacex' : 'base',
    ] as const,
};
