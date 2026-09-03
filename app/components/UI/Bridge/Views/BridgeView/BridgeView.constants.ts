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

export const DEBOUNCE_WAIT = 300;

export const TAB_TO_FEATURE_ID = {
  [BridgeTabKey.Market]: FeatureId.UNIFIED_SWAP_BRIDGE,
  [BridgeTabKey.Limit]: FeatureId.LIMIT_ORDER,
  [BridgeTabKey.Recurring]: FeatureId.RECURRING_BUY,
};
