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
 * Extra clearance below the pinned Trade hub chrome that only the Swaps
 * screen wants. Added on top of the shared `FIXED_HUB_CONTENT_GAP` inside
 * `FixedHubChromeSpacer` by each Swaps tab, so the Swaps content sits 8px
 * further from the tabs than the other hub screens without moving them.
 */
export const SWAPS_HUB_EXTRA_CONTENT_GAP = 8;

/**
 * Feature IDs that have been migrated to use the SwapQuotesProvider
 * To migrate a feature ID, add it to this list and replace the useBridgeQuoteRequest hook with useSwapQuotes.
 */
export const MIGRATED_FEATURE_IDS: FeatureId[] = [
  FeatureId.QUICK_BUY_EXPLORE,
  FeatureId.QUICK_BUY_FOLLOW_TRADING,
  FeatureId.QUICK_BUY_TOKEN_DETAILS,
];
