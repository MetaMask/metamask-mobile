/**
 * Stable, shallow imports for cross-team ramp **buy** navigation.
 * Prefer importing from this module rather than deep Aggregator/Deposit paths.
 */
export { navigateToRampBuy } from './utils/navigateToRampBuy';
export type {
  NavigateToRampBuyNavigation,
  NavigateToRampBuyDeps,
  NavigateToRampBuyOptions,
} from './utils/navigateToRampBuy';
export { NavigateToRampBuyMode } from './utils/navigateToRampBuy';
export type { RampIntent } from './types';
export type { BuyFlowOrigin } from './Views/BuildQuote/BuildQuote';
