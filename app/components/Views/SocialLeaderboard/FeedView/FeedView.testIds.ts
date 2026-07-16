export const FeedViewSelectorsIDs = {
  CONTAINER: 'feed-view-container',
  LIST: 'feed-view-list',
  EMPTY_STATE: 'feed-view-empty-state',
  TYPE_EMPTY_STATE: 'feed-view-type-empty-state',
  LOAD_MORE_BUTTON: 'feed-view-load-more-button',
  LOADING: 'feed-view-loading',
  FOOTER_LOADING: 'feed-view-footer-loading',
  ERROR_STATE: 'feed-view-error-state',
  RETRY_BUTTON: 'feed-view-retry-button',
  AUDIENCE_TOGGLE: 'feed-view-audience-toggle',
  TRADE_BUTTON: 'feed-view-trade-button',
  TRADE_CARD: 'feed-view-trade-card',
} as const;

export const getFeedItemTestId = (id: string) => `feed-item-${id}`;
export const getFeedTradeButtonTestId = (id: string) =>
  `${FeedViewSelectorsIDs.TRADE_BUTTON}-${id}`;
export const getFeedTradeCardTestId = (id: string) =>
  `${FeedViewSelectorsIDs.TRADE_CARD}-${id}`;
export const getFeedTraderTestId = (id: string) => `feed-item-trader-${id}`;
export const getFeedAudienceOptionTestId = (audience: string) =>
  `${FeedViewSelectorsIDs.AUDIENCE_TOGGLE}-${audience}`;
