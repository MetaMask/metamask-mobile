import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import type { RootState } from '../../../../../reducers';

export const selectPerpsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPerpsServiceInterruptionBannerEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag =
      process.env.MM_PERPS_SERVICE_INTERRUPTION_BANNER_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpTradingServiceInterruptionBannerEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPerpsGtmOnboardingModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PERPS_GTM_MODAL_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.perpsPerpGtmOnboardingModalEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

/**
 * Selector for HIP-3 configuration version
 * Used by ConnectionManager to detect when HIP-3 config changes and trigger reconnection
 *
 * @param state - Redux root state
 * @returns number - Version increments when HIP-3 config changes
 */
export const selectHip3ConfigVersion = createSelector(
  (state: RootState) => state?.engine?.backgroundState?.PerpsController,
  (perpsController) => perpsController?.hip3ConfigVersion ?? 0,
);
