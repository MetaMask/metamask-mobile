import { createSelector } from 'reselect';
import { CaipChainId, Json } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '../../featureFlagController';

interface RawBridgeLimitOrderFeatureFlagValue extends Record<string, Json> {
  enabled: boolean;
  enabledChainIds: CaipChainId[];
  baseUrl: string;
}

interface RawBridgeRecurringBuyFeatureFlagValue extends Record<string, Json> {
  enabled: boolean;
  enabledChainIds: CaipChainId[];
}

interface RawSentinelFeeTokensFeatureFlagValue extends Record<string, Json> {
  cacheTtlMs: number;
}

export const DEFAULT_SENTINEL_FEE_TOKENS_CACHE_TTL_MS = 15 * 60 * 1000;

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
 * @returns `{ enabled, enabledChainIds, baseUrl }` for the Limit Order feature.
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

export const selectSentinelFeeTokensFeatureFlags =
  createBridgeSwapFeatureFlagsSelector<RawSentinelFeeTokensFeatureFlagValue>(
    'swapsSentinelFeeTokens',
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
 * Selector for the base URL of the limit orders API.
 *
 * @returns string - the `baseUrl` of the Limit Order feature flag, or
 * undefined if the flag is missing.
 */
export const selectBridgeLimitOrderBaseUrl = createSelector(
  selectBridgeLimitOrderFeatureFlags,
  (flags): string | undefined => flags?.baseUrl,
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

/**
 * Selector for the Sentinel fee-token cache TTL.
 *
 * @returns A positive TTL from LaunchDarkly, or the 15-minute default.
 */
export const selectSentinelFeeTokensCacheTtlMs = createSelector(
  selectSentinelFeeTokensFeatureFlags,
  (flags): number => {
    const cacheTtlMs = flags?.cacheTtlMs;

    return typeof cacheTtlMs === 'number' &&
      Number.isFinite(cacheTtlMs) &&
      cacheTtlMs > 0
      ? cacheTtlMs
      : DEFAULT_SENTINEL_FEE_TOKENS_CACHE_TTL_MS;
  },
);
