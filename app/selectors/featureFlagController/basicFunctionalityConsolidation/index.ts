import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectIsBasicFunctionalityConsolidatedEnabled } from '../../settings';

export const MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME =
  'mobileUxBftcConsolidation';

/**
 * Remote rollout flag for consolidated Basic Functionality (version-gated).
 * Default OFF in production; acts as kill-switch when disabled.
 */
export const selectMobileUxBftcConsolidationFlagEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags?.[
      MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);

/**
 * True when the user should see consolidated Basic Functionality settings.
 * Requires both the remote flag and the persisted onboarding cohort marker.
 */
export const selectIsBasicFunctionalityConsolidationEnabled = createSelector(
  selectMobileUxBftcConsolidationFlagEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
  (isRemoteFlagEnabled, isConsolidatedUser) =>
    isRemoteFlagEnabled && isConsolidatedUser,
);
