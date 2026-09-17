import type { WatchlistTokenWithBalance } from './addBalanceToTokens';

/** How many tokens to offer as suggestions before watchlist exclusions. */
export const SUGGESTED_WATCHLIST_LIMIT = 5;

/**
 * Returns suggested watchlist tokens shown beneath the user's watchlist.
 *
 * Target count shrinks with the watchlist size so that watchlist rows +
 * suggestions always sum to `limit`:
 * 0 watched → `limit` suggestions
 * 2 watched → `limit - 2` suggestions
 * …
 * `limit`+ watched → no suggestions (the section hides entirely)
 *
 * Unlike the perps flow (`getSuggestedWatchlistMarkets`), which floors at one
 * suggestion, the token watchlist hard-caps at zero once the watchlist is
 * full so the homepage section never overflows its 5-row budget.
 *
 * Asset IDs are compared case-insensitively (the storage blob lowercases).
 * Returns [] only when every suggested token is already watchlisted or the
 * watchlist is full.
 */
export const getSuggestedWatchlistTokens = (
  suggestedTokens: WatchlistTokenWithBalance[],
  watchlistAssetIds: readonly string[],
  limit = SUGGESTED_WATCHLIST_LIMIT,
): WatchlistTokenWithBalance[] => {
  const targetCount = Math.max(0, limit - watchlistAssetIds.length);
  const watched = new Set(
    watchlistAssetIds.map((assetId) => assetId.toLowerCase()),
  );
  const nonWatchlisted = suggestedTokens.filter(
    (token) => !watched.has(String(token.assetId).toLowerCase()),
  );
  return nonWatchlisted.slice(0, targetCount);
};
