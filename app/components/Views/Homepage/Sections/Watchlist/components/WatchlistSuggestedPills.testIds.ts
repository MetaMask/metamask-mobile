export const WatchlistSuggestedPillsTestIds = {
  CONTAINER: 'watchlist-suggested-pills',
  HEADER: 'watchlist-suggested-header',
  SCROLL: 'watchlist-suggested-pills-scroll',
  pill: (assetId: string) => `watchlist-suggested-pill-${assetId}`,
  pillBody: (assetId: string) => `watchlist-suggested-pill-body-${assetId}`,
  addButton: (assetId: string) =>
    `watchlist-suggested-pill-add-button-${assetId}`,
} as const;
