import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';
import { PredictHotTabFlag } from '../../types/flags';
import { DEFAULT_HOT_TAB_FLAG } from '../../constants/flags';

/**
 * Selector for Predict trading feature enablement
 *
 * Uses version-gated feature flag `predictTradingEnabled` from remote config.
 * Falls back to `true` if remote flag is unavailable or invalid.
 *
 * Version gating ensures users have minimum app version (7.60.0) to access feature.
 *
 * @returns {boolean} True if feature is enabled and version requirement is met
 */
export const selectPredictEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.predictTradingEnabled as unknown as VersionGatedFeatureFlag;

    // Default to `true` if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? true;
  },
);

export const selectPredictGtmOnboardingModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_PREDICT_GTM_MODAL_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.predictGtmOnboardingModalEnabled as unknown as VersionGatedFeatureFlag;

    // Fallback to local flag if remote flag is not available
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectPredictHotTabFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): PredictHotTabFlag => {
    const flag =
      remoteFeatureFlags?.predictHotTab as unknown as PredictHotTabFlag;

    if (
      !validatedVersionGatedFeatureFlag(
        flag as unknown as VersionGatedFeatureFlag,
      )
    ) {
      return DEFAULT_HOT_TAB_FLAG;
    }

    return flag;
  },
);
