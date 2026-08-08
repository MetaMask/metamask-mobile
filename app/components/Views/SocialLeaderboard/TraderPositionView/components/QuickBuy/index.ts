/** Compound API — prefer `QuickBuy.Root`, `QuickBuy.AmountScreen`, etc. */
export { QuickBuy } from './quickBuy';

export type { QuickBuyRootProps } from './types';
export type { QuickBuyContextValue } from './QuickBuyContext';
export type { QuickBuySheetProps } from './types';
export type { TraderPositionQuickBuyProps } from './TraderPositionQuickBuy';
export type {
  QuickBuyTarget,
  QuickBuyFeatures,
  QuickBuyTradeMode,
  QuickBuyScreen,
  QuickBuyAnalyticsContext,
} from './types';

export { TOP_TRADERS_QUICK_BUY_FEATURES } from './features';
export { positionToQuickBuyTarget } from './types';

/** Top Traders host adapter */
export { default as TraderPositionQuickBuy } from './TraderPositionQuickBuy';
export { default } from './TraderPositionQuickBuy';

/** Named convenience exports — same components as `QuickBuy.*` */
export { default as QuickBuyRoot } from './QuickBuyRoot';
export { default as QuickBuyAmountScreen } from './QuickBuyAmountScreen';
export { default as QuickBuyAmount } from './QuickBuyAmount';
export { default as QuickBuyToolbar } from './components/QuickBuyToolbar';
export { default as QuickBuyFooter } from './components/QuickBuyActionFooter';
