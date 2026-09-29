export const QuickBuySheetSelectorsIDs = {
  CONTENT_CONTAINER: 'quick-buy-content-container',
  CONTENT_LOADING: 'quick-buy-content-loading',
  AMOUNT_CONTAINER: 'quick-buy-amount-container',
  AMOUNT_AREA: 'quick-buy-amount-area',
  AMOUNT_AREA_PRESSABLE: 'quick-buy-amount-area-pressable',
  PAY_WITH_BUTTON: 'quick-buy-pay-with-button',
  PAY_WITH_HEADER: 'quick-buy-pay-with-header',
  PAY_WITH_BACK: 'quick-buy-pay-with-back',
  CONFIRM_BUTTON: 'quick-buy-confirm-button',
  RATE_TAG: 'quick-buy-rate-tag',
  RATE_TAG_PRESSABLE: 'quick-buy-rate-tag-pressable',
  RATE_ROW: 'quick-buy-rate-row',
  EDIT_SLIPPAGE: 'quick-buy-edit-slippage',
  CLOSE_BUTTON: 'quick-buy-close-button',
  EDIT_AMOUNTS_BUTTON: 'quick-buy-edit-amounts-button',
  EDIT_AMOUNTS_CONFIRM: 'quick-buy-edit-amounts-confirm',
  SUB_SCREEN_BACK: 'quick-buy-sub-screen-back-button',
  SUB_SCREEN_CLOSE: 'quick-buy-sub-screen-close-button',
  PRICE_IMPACT_DESCRIPTION: 'price-impact-description',
  KEYPAD: 'quick-buy-keypad',
  KEYPAD_REVEAL: 'quick-buy-keypad-reveal',
  KEYPAD_KEY_1: 'keypad-key-1',
  KEYPAD_KEY_2: 'keypad-key-2',
  KEYPAD_KEY_0: 'keypad-key-0',
  BUY_PILL_PREFIX: 'quick-buy-buy-pill-',
  SELL_PILL_PREFIX: 'quick-buy-sell-pill-',
  PAY_WITH_ROW_PREFIX: 'quick-buy-pay-with-row-',
  CHAIN_FILTER_PREFIX: 'quick-buy-chain-filter-',
  TRADE_MODE_BUY: 'quick-buy-trade-mode-buy',
  TRADE_MODE_SELL: 'quick-buy-trade-mode-sell',
  DISABLED_AMOUNT: 'quick-buy-disabled-amount',
  DISABLED_KEYPAD: 'quick-buy-disabled-keypad',
  DISABLED_FOOTER: 'quick-buy-disabled-footer',
  EDIT_BUY_FIELD_PREFIX: 'quick-buy-edit-buy-field-',
} as const;

export type QuickBuySheetSelectorsIDsType = typeof QuickBuySheetSelectorsIDs;

export const getQuickBuyBuyPillTestId = (presetValue: number | string) =>
  `${QuickBuySheetSelectorsIDs.BUY_PILL_PREFIX}${presetValue}`;

export const getQuickBuySellPillTestId = (percent: number | string) =>
  `${QuickBuySheetSelectorsIDs.SELL_PILL_PREFIX}${percent}`;

export const getQuickBuyPayWithRowTestId = (address: string, chainId: string) =>
  `${QuickBuySheetSelectorsIDs.PAY_WITH_ROW_PREFIX}${address.toLowerCase()}:${chainId}`;

export const getQuickBuyChainFilterTestId = (chainId: string | null) =>
  `${QuickBuySheetSelectorsIDs.CHAIN_FILTER_PREFIX}${chainId ?? 'all'}`;

export const getQuickBuyEditBuyFieldTestId = (index: number) =>
  `${QuickBuySheetSelectorsIDs.EDIT_BUY_FIELD_PREFIX}${index}`;
