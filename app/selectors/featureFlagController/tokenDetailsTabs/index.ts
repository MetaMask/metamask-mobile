import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * LaunchDarkly key for the token details tabs (Overview / Feed).
 * Note: LD keys use kebab-case; the client-config registry stores the camelCase variant.
 */
export const TOKEN_DETAILS_TABS_FLAG_KEY = 'tokenDetailsTabs' as const;

/**
 * TEMPORARY: the LaunchDarkly flag is not provisioned yet, so the tabs are
 * force-enabled while the feature is being built. Set to `false` (or remove)
 * once the remote flag exists so the selector falls back to LD.
 */
export const TOKEN_DETAILS_TABS_MOCK_ENABLED = true;

/**
 * Whether the token details screen should render the sticky tab view
 * (Overview / Feed) below the chart and action buttons.
 *
 * LaunchDarkly variation value (direct or wrapped in `{ value: ... }`):
 * `{ "enabled": true | false, "minimumVersion": "7.xx" }`
 *
 * Returns `true` only when `enabled` is true and the app version satisfies `minimumVersion`.
 */
export const selectTokenDetailsTabsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (TOKEN_DETAILS_TABS_MOCK_ENABLED) {
      return true;
    }
    const remoteFlag = remoteFeatureFlags?.[TOKEN_DETAILS_TABS_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
