import type { PriceRangeTokenSide } from '../../utils/priceRange';

export const PriceRangeSheetSelectorsIDs = {
  SHEET: 'price-range-sheet',
  CLOSE_BUTTON: 'price-range-sheet-close',
  CONFIRM_BUTTON: 'price-range-sheet-confirm',
  CLEAR_ALL: 'price-range-sheet-clear-all',
  TOKEN_CONTROL: 'price-range-token-control',
  TOKEN_OPTION: (side: PriceRangeTokenSide) => `price-range-token-${side}`,
  PRICE: 'price-range-price',
  EXCHANGE_RATE: 'price-range-exchange-rate',
  MIN_INPUT: 'price-range-min-input',
  MAX_INPUT: 'price-range-max-input',
  KEYPAD_DISMISS: 'price-range-keypad-dismiss',
  PERCENT: (bound: 'min' | 'max', percent: number) =>
    `price-range-${bound}-percent-${percent}`,
} as const;
