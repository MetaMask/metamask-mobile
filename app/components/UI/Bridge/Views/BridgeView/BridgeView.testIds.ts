export const BridgeViewSelectorsIDs = {
  SOURCE_TOKEN_AREA: 'source-token-area',
  DESTINATION_TOKEN_AREA: 'dest-token-area',
  SOURCE_TOKEN_INPUT: 'source-token-area-input',
  DESTINATION_TOKEN_INPUT: 'dest-token-area-input',
  CONFIRM_BUTTON: 'bridge-confirm-button',
  CONFIRM_BUTTON_KEYPAD: 'bridge-confirm-button-keypad',
  BRIDGE_VIEW_SCROLL: 'bridge-view-scroll',
  TRENDING_TOKENS_SECTION: 'bridge-trending-tokens-section',
  TRENDING_PRICE_FILTER: 'bridge-trending-price-filter',
  TRENDING_NETWORK_FILTER: 'bridge-trending-network-filter',
  TRENDING_TIME_FILTER: 'bridge-trending-time-filter',
  TRENDING_SHOW_MORE: 'bridge-trending-show-more',
  QUOTE_DETAILS_SKELETON: 'bridge-quote-details-skeleton',
} as const;

export type BridgeViewSelectorsIDsType = typeof BridgeViewSelectorsIDs;
