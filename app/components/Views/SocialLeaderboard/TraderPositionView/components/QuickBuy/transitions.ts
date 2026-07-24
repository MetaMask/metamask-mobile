import type { QuickBuyScreen } from './types';

/**
 * Screens that push onto the in-sheet stack from the amount root.
 * Backdrop / sheet Y / handle stay put; contents slide full-width.
 */
export const SHEET_STACK_SCREENS: ReadonlySet<QuickBuyScreen> = new Set([
  'payWith',
  'quoteDetails',
  'selectQuote',
  'priceImpactConfirm',
]);

export const isSheetStackScreen = (screen: QuickBuyScreen): boolean =>
  SHEET_STACK_SCREENS.has(screen);

/** Navigation depth per screen; used for analytics / ordering only. */
export const SCREEN_DEPTH: Record<QuickBuyScreen, number> = {
  amount: 0,
  payWith: 1,
  quoteDetails: 1,
  selectQuote: 2,
  priceImpactConfirm: 1,
};
