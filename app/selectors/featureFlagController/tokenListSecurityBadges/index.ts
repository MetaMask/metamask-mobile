import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Registry / client-config key — camelCase like `tokenDetailsAdvancedCharts`,
 * `trxStakingEnabled`, etc. (hyphenated LaunchDarkly keys are normalized for the mobile payload.)
 */
export const TOKEN_LIST_SECURITY_BADGES_FLAG_KEY =
  'tokenListSecurityBadges' as const;

/**
 * Whether token list rows should show security badges (batched token API security payload).
 *
 * LaunchDarkly variation value (direct or wrapped in `{ value: ... }`):
 * `{ "enabled": true | false, "minimumVersion": "7.73" }`
 *
 * Returns `true` only when `enabled` is true and the app version satisfies `minimumVersion`.
 * Otherwise `false`, including invalid or missing payloads.
 */
export const selectTokenListSecurityBadgesEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteFlag =
      remoteFeatureFlags?.[TOKEN_LIST_SECURITY_BADGES_FLAG_KEY];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
