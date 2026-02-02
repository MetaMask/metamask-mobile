import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../../util/remoteFeatureFlag';

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

/**
 * Variant options for the Predict home featured section
 */
export type PredictHomeFeaturedVariant = 'carousel' | 'list';

/**
 * Feature flag interface for Predict home featured variant
 * Extends VersionGatedFeatureFlag to include version gating
 */
export interface PredictHomeFeaturedVariantFlag
  extends VersionGatedFeatureFlag {
  variant: PredictHomeFeaturedVariant;
}

/**
 * Selector for Predict home featured variant
 *
 * Uses version-gated feature flag `predictHomeFeaturedVariant` from remote config.
 * Falls back to `'carousel'` if remote flag is unavailable, invalid, or version
 * requirement is not met.
 *
 * @returns {PredictHomeFeaturedVariant} The variant to display ('carousel' or 'list')
 */
export const selectPredictHomeFeaturedVariant = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): PredictHomeFeaturedVariant => {
    const remoteFlag =
      remoteFeatureFlags?.predictHomeFeaturedVariant as unknown as PredictHomeFeaturedVariantFlag;

    const isEnabled = validatedVersionGatedFeatureFlag(remoteFlag);

    if (!isEnabled) {
      return 'carousel';
    }

    if (remoteFlag?.variant === 'list') {
      return 'list';
    }

    return 'carousel';
  },
);
