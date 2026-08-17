import { createSelector } from 'reselect';
import { Json, hasProperty, isObject } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';

/**
 * Resolved shape of a Bridge tab remote flag.
 */
interface BridgeTabEnabledFlagValue extends Record<string, Json> {
  enabled: boolean;
}

const isBridgeTabEnabledFlagValue = (
  value: Json,
): value is BridgeTabEnabledFlagValue =>
  isObject(value) &&
  hasProperty(value, 'enabled') &&
  typeof value.enabled === 'boolean';

/**
 * Builds a selector for a Bridge tab feature flag.
 * Remote flag wins when present and valid; otherwise falls back to the
 * local env override so the tab can still be toggled on for local dev
 * without waiting on a remote config change.
 */
const createBridgeTabEnabledSelector = (
  remoteFlagName: string,
  localFlagEnvVar: string | undefined,
) =>
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags): boolean => {
    const remoteFlag = remoteFeatureFlags?.[remoteFlagName];
    if (isBridgeTabEnabledFlagValue(remoteFlag)) {
      return remoteFlag.enabled;
    }

    return localFlagEnvVar === 'true';
  });

/**
 * Selector for the Bridge Limit Order tab feature flag.
 * Controls visibility of the "Limit" tab in the Bridge/Swap view.
 *
 * @returns boolean - true if the Limit Order tab should be shown, false otherwise
 */
export const selectBridgeLimitOrderTabEnabledFlag =
  createBridgeTabEnabledSelector(
    'swapsLimitOrder',
    process.env.MM_BRIDGE_LIMIT_ORDER_TAB_ENABLED,
  );

/**
 * Selector for the Bridge Recurring Buy tab feature flag.
 * Controls visibility of the "Recurring" tab in the Bridge/Swap view.
 *
 * @returns boolean - true if the Recurring Buy tab should be shown, false otherwise
 */
export const selectBridgeRecurringBuyTabEnabledFlag =
  createBridgeTabEnabledSelector(
    'swapsRecurringBuy',
    process.env.MM_BRIDGE_RECURRING_BUY_TAB_ENABLED,
  );
