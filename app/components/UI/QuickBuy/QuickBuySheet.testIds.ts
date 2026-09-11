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
  KEYPAD_KEY_0: 'keypad-key-0',
  BUY_PILL_PREFIX: 'quick-buy-buy-pill-',
} as const;

export type QuickBuySheetSelectorsIDsType = typeof QuickBuySheetSelectorsIDs;

export const getQuickBuyBuyPillTestId = (presetValue: number | string) =>
  `${QuickBuySheetSelectorsIDs.BUY_PILL_PREFIX}${presetValue}`;
