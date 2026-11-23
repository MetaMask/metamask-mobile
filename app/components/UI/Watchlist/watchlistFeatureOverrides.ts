/**
 * Temporary local QA override for the unified Perps watchlist rollout.
 *
 * TODO(remove after manual testing): delete this override and restore the
 * remote feature-flag-only behavior.
 */
export const isWatchlistPerpsOverrideEnabled = (
  nodeEnv: string | undefined,
): boolean => nodeEnv === 'development';

export const TEMPORARY_ENABLE_WATCHLIST_PERPS = isWatchlistPerpsOverrideEnabled(
  process.env.NODE_ENV,
);
