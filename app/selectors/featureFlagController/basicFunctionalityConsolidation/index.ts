import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectIsBasicFunctionalityConsolidatedEnabled } from '../../settings';
import {
  selectIsBasicFunctionalityConsistent,
  selectIsBasicFunctionalitySocialLoginUser,
} from './basicFunctionality';

export const MOBILE_UX_BFTC_CONSOLIDATION_FLAG_NAME =
  'mobileUxBftcConsolidation';

export {
  selectIsBasicFunctionalityConsistent,
  selectIsBasicFunctionalitySocialLoginUser,
} from './basicFunctionality';

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
 * Requires the remote flag plus either the persisted cohort marker or a
 * consistent legacy all-on / all-off configuration.
 */
export const selectIsBasicFunctionalityConsolidationEnabled = createSelector(
  selectMobileUxBftcConsolidationFlagEnabled,
  selectIsBasicFunctionalityConsolidatedEnabled,
  selectIsBasicFunctionalityConsistent,
  (isRemoteFlagEnabled, isPersistedConsolidatedUser, isConsistentLegacyUser) =>
    isRemoteFlagEnabled &&
    (isPersistedConsolidatedUser || isConsistentLegacyUser),
);

/**
 * True when social-login users should have the Basic Functionality toggle
 * disabled (locked on) under consolidation.
 */
export const selectIsBasicFunctionalityToggleDisabled = createSelector(
  selectIsBasicFunctionalityConsolidationEnabled,
  selectIsBasicFunctionalitySocialLoginUser,
  (isConsolidationEnabled, isSocialLoginUser) =>
    isConsolidationEnabled && isSocialLoginUser,
);
