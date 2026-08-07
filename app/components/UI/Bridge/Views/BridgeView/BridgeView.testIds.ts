export const BridgeViewSelectorsIDs = {
  SOURCE_TOKEN_AREA: 'source-token-area',
  DESTINATION_TOKEN_AREA: 'dest-token-area',
  SOURCE_TOKEN_INPUT: 'source-token-area-input',
  SOURCE_AMOUNT_TYPE_TOGGLE: 'source-token-area-amount-type-toggle',
  DESTINATION_TOKEN_INPUT: 'dest-token-area-input',
  SLIPPAGE_SETTINGS_BUTTON: 'bridge-slippage-settings-button',
  CONFIRM_BUTTON: 'bridge-confirm-button',
  CONFIRM_BUTTON_KEYPAD: 'bridge-confirm-button-keypad',
  BRIDGE_VIEW_SCROLL: 'bridge-view-scroll',
  FEE_DISCLAIMER: 'bridge-fee-disclaimer',
  QUOTE_DETAILS_SKELETON: 'bridge-quote-details-skeleton',
  MISSING_PRICE_BANNER: 'bridge-missing-price-banner',
  NO_QUOTES_BANNER: 'bridge-no-quotes',
  OFF_HOURS_TRADING_BANNER: 'bridge-off-hours-trading-banner',
} as const;

export type BridgeViewSelectorsIDsType = typeof BridgeViewSelectorsIDs;
