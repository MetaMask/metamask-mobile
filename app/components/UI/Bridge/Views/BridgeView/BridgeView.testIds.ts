export const BridgeViewSelectorsIDs = {
  SOURCE_TOKEN_AREA: 'source-token-area',
  DESTINATION_TOKEN_AREA: 'dest-token-area',
  SOURCE_TOKEN_INPUT: 'source-token-area-input',
  DESTINATION_TOKEN_INPUT: 'dest-token-area-input',
  CONFIRM_BUTTON: 'bridge-confirm-button',
  CONFIRM_BUTTON_KEYPAD: 'bridge-confirm-button-keypad',
  BRIDGE_VIEW_SCROLL: 'bridge-view-scroll',
  FEE_DISCLAIMER: 'bridge-fee-disclaimer',
  QUOTE_DETAILS_SKELETON: 'bridge-quote-details-skeleton',
  MISSING_PRICE_BANNER: 'bridge-missing-price-banner',
} as const;

export type BridgeViewSelectorsIDsType = typeof BridgeViewSelectorsIDs;
