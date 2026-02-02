import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
  hasMinimumRequiredVersion,
} from '../../../../../util/remoteFeatureFlag';
import { PredictHotTabFlag } from '../../types/flags';
import { DEFAULT_HOT_TAB_FLAG } from '../../constants/flags';

/**
 * Type guard to validate that a value is a valid PredictHotTabFlag
 *
 * This prevents issues where the backend might send `enabled: "false"` (string)
 * instead of `enabled: false` (boolean), which would be truthy in JavaScript.
 *
 * @param value - The value to check
 * @returns True if the value is a valid PredictHotTabFlag structure
 */
function isValidPredictHotTabFlag(value: unknown): value is PredictHotTabFlag {
  return (
    typeof value === 'object' &&
    value !== null &&
    'enabled' in value &&
    typeof (value as { enabled: unknown }).enabled === 'boolean' &&
    (!('queryParams' in value) ||
      typeof (value as { queryParams: unknown }).queryParams === 'string') &&
    (!('minimumVersion' in value) ||
      typeof (value as { minimumVersion: unknown }).minimumVersion === 'string')
  );
}

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
    const flag = remoteFeatureFlags?.predictHotTab;
    if (!isValidPredictHotTabFlag(flag)) {
      return DEFAULT_HOT_TAB_FLAG;
    }

    if (
      flag.minimumVersion &&
      !hasMinimumRequiredVersion(flag.minimumVersion)
    ) {
      return DEFAULT_HOT_TAB_FLAG;
    }

    return flag;
  },
);
