import { FeatureId } from '@metamask/bridge-controller';

/**
 * Tabs rendered by the Bridge view. Values are used as stable keys, matched
 * against `TabsBar`'s filtered tab list by key rather than by index, since
 * the Limit and Recurring tabs may be hidden when their feature flags are
 * disabled.
 */
export enum BridgeTabKey {
  Market = 'market',
  Limit = 'limit',
  Recurring = 'recurring',
}

export const TAB_TO_FEATURE_ID = {
  [BridgeTabKey.Market]: FeatureId.UNIFIED_SWAP_BRIDGE,
  [BridgeTabKey.Limit]: FeatureId.LIMIT_ORDER,
  [BridgeTabKey.Recurring]: FeatureId.RECURRING_ORDER,
};

export const DEBOUNCE_WAIT = 300;

/**
 * Fraction a rate may move before a typed fiat amount re-derives its token
 * amount on quoted tabs. Every token amount change there re-quotes, so small
 * rate moves are absorbed instead of re-quoting on each rate update.
 */
export const QUOTED_TYPED_FIAT_RATE_TOLERANCE = 0.005;

/**
 * Feature IDs that have been migrated to use the SwapQuotesProvider
 * To migrate a feature ID, add it to this list and replace the useBridgeQuoteRequest hook with useSwapQuotes.
 */
export const MIGRATED_FEATURE_IDS: FeatureId[] = [
  FeatureId.QUICK_BUY_EXPLORE,
  FeatureId.QUICK_BUY_FOLLOW_TRADING,
  FeatureId.QUICK_BUY_TOKEN_DETAILS,
];
