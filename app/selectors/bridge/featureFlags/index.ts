import { createSelector } from 'reselect';
import { CaipChainId, Json } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '../../featureFlagController';

interface RawBridgeLimitOrderFeatureFlagValue extends Record<string, Json> {
  enabled: boolean;
  enabledChainIds: CaipChainId[];
}

interface RawBridgeRecurringBuyFeatureFlagValue extends Record<string, Json> {
  enabled: boolean;
}

/**
 * Builds a selector for a Bridge swap feature flag (Limit Order, Recurring
 * Buy/DCA, etc). Remote flag wins when present and valid; otherwise falls
 * back to the local env override (and its accompanying chain list) so the
 * feature can still be toggled on for local dev without waiting on a remote
 * config change.
 */
const createBridgeSwapFeatureFlagsSelector = <T extends Record<string, Json>>(
  remoteFlagName: string,
) =>
  createSelector(
    selectRemoteFeatureFlags,
    (remoteFeatureFlags): T | undefined => {
      const remoteFlag = remoteFeatureFlags?.[remoteFlagName];
      return remoteFlag as unknown as T | undefined;
    },
  );

/**
 * Selector for the Bridge Limit Order feature flag.
 * Provides both whether the "Limit" tab should be shown and which chains its
 * token selectors are restricted to.
 *
 * @returns `{ enabled, enabledChainIds }` for the Limit Order feature.
 */
export const selectBridgeLimitOrderFeatureFlags =
  createBridgeSwapFeatureFlagsSelector<RawBridgeLimitOrderFeatureFlagValue>(
    'swapsLimitOrder',
  );

/**
 * Selector for the Bridge Recurring Buy (DCA) feature flag.
 * Provides both whether the "Recurring" tab should be shown and which chains
 * its token selectors are restricted to.
 *
 * @returns `{ enabled, enabledChainIds }` for the Recurring Buy feature.
 */
export const selectBridgeRecurringBuyFeatureFlags =
  createBridgeSwapFeatureFlagsSelector<RawBridgeRecurringBuyFeatureFlagValue>(
    'swapsRecurringBuy',
  );

/**
 * Selector for the Bridge Limit Order tab feature flag.
 * Controls visibility of the "Limit" tab in the Bridge/Swap view.
 *
 * @returns boolean - true if the Limit Order tab should be shown, false otherwise
 */
export const selectBridgeLimitOrderTabEnabledFlag = createSelector(
  selectBridgeLimitOrderFeatureFlags,
  (flags): boolean => flags?.enabled ?? false,
);

/**
 * Selector for the Bridge Recurring Buy tab feature flag.
 * Controls visibility of the "Recurring" tab in the Bridge/Swap view.
 *
 * @returns boolean - true if the Recurring Buy tab should be shown, false otherwise
 */
export const selectBridgeRecurringBuyTabEnabledFlag = createSelector(
  selectBridgeRecurringBuyFeatureFlags,
  (flags): boolean => flags?.enabled ?? false,
);
