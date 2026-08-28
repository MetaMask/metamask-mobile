export const QuickBuySheetSelectorsIDs = {
  CONTENT_CONTAINER: 'quick-buy-content-container',
  CONTENT_LOADING: 'quick-buy-content-loading',
  AMOUNT_CONTAINER: 'quick-buy-amount-container',
  AMOUNT_AREA: 'quick-buy-amount-area',
  AMOUNT_AREA_PRESSABLE: 'quick-buy-amount-area-pressable',
  PAY_WITH_BUTTON: 'quick-buy-pay-with-button',
  CONFIRM_BUTTON: 'quick-buy-confirm-button',
  RATE_TAG: 'quick-buy-rate-tag',
  KEYPAD: 'quick-buy-keypad',
  KEYPAD_REVEAL: 'quick-buy-keypad-reveal',
  KEYPAD_KEY_1: 'keypad-key-1',
  KEYPAD_KEY_0: 'keypad-key-0',
  BUY_PILL_PREFIX: 'quick-buy-buy-pill-',
} as const;

export type QuickBuySheetSelectorsIDsType = typeof QuickBuySheetSelectorsIDs;

export const getQuickBuyBuyPillTestId = (presetValue: number | string) =>
  `${QuickBuySheetSelectorsIDs.BUY_PILL_PREFIX}${presetValue}`;
