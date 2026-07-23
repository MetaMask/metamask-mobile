export enum WatchlistDefaultTokenCardTestIds {
  CARD = 'watchlist-default-token-card',
  CHECKBOX = 'watchlist-default-token-card-checkbox',
  SYMBOL = 'watchlist-default-token-card-symbol',
  PRICE_CHANGE = 'watchlist-default-token-card-price-change',
}

export const getWatchlistDefaultTokenCardTestId = (assetId: string): string =>
  `${WatchlistDefaultTokenCardTestIds.CARD}-${assetId}`;
