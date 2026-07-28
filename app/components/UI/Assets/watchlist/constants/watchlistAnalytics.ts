/** Analytics literals for token watchlist events (v1 tokens-only). */
export const WatchlistAnalytics = {
  ACTIVE_TAB: {
    TOKENS: 'tokens',
  },
  PAGE_VIEW_SOURCE: {
    /** User opened fullscreen from the homepage watchlist section header. */
    HOMEPAGE: 'watchlist_homepage',
  },
  REMOVE_SOURCE: {
    /** User removed a token via edit mode on the fullscreen watchlist. */
    FULLSCREEN_EDIT: 'watchlist_fullscreen_edit',
  },
} as const;

export const getWatchlistAssetType = (assetId: string): 'native' | 'erc20' =>
  assetId.includes('/erc20:') ? 'erc20' : 'native';
