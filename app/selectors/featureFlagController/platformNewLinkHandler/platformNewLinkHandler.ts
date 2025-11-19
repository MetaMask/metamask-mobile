import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Feature flag names for the universal link handler system
 */
export const NEW_LINK_HANDLER_SYSTEM_FLAG = 'platform-new-link-handler-system';
export const NEW_LINK_HANDLER_ACTIONS_FLAG = 'platformNewLinkHandlerActions';

/**
 * Type definition for the universal router actions feature flag
 * Maps action names (e.g., 'home', 'swap', 'send') to boolean enabled state
 */
export interface PlatformNewLinkHandlerActionsFlag {
  [action: string]: boolean;
}

/**
 * Selector to check if the platform new link handler system is globally enabled
 * This acts as a master kill switch for the entire new link handling system
 *
 * @param state - The Redux state
 * @returns true if the system is enabled, false otherwise
 */
export const selectPlatformNewLinkHandlerSystemEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    remoteFeatureFlags?.[NEW_LINK_HANDLER_SYSTEM_FLAG] === true,
);

/**
 * Selector to get the enabled actions for the platform new link handler
 * Provides safe fallback if the remote flag is malformed or missing
 *
 * @param state - The Redux state
 * @returns Object mapping action names to their enabled state, or empty object if malformed
 */
export const selectPlatformNewLinkHandlerActions = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): PlatformNewLinkHandlerActionsFlag => {
    const actions =
      remoteFeatureFlags?.[NEW_LINK_HANDLER_ACTIONS_FLAG];

    // Validate and provide fallback for malformed data
    if (
      typeof actions !== 'object' ||
      actions === null ||
      Array.isArray(actions)
    ) {
      return {}; // Safe fallback - no actions enabled
    }

    return actions as PlatformNewLinkHandlerActionsFlag;
  },
);

