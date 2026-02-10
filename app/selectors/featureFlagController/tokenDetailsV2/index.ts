import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

// Valid variants for the layout A/B test
const VALID_LAYOUT_VARIANTS = ['control', 'treatment'] as const;

/**
 * Selector for Token Details Layout A/B test variant
 *
 * Reads the variant name from LaunchDarkly feature flag.
 * Returns null if the test is disabled or flag is not set.
 *
 * @returns 'control' | 'treatment' | null
 */
export const selectTokenDetailsLayoutTestVariant = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string | null => {
    // return 'treatment';
    const remoteFlag = remoteFeatureFlags?.tokenDetailsLayoutAbTest;

    if (!remoteFlag) {
      return null;
    }

    // Direct string variant from LaunchDarkly
    if (typeof remoteFlag === 'string') {
      if (
        VALID_LAYOUT_VARIANTS.includes(
          remoteFlag as (typeof VALID_LAYOUT_VARIANTS)[number],
        )
      ) {
        return remoteFlag;
      }
      return null;
    }

    return null;
  },
);

/**
 * Keep TokenDetailsV2Enabled - always true since we use the V2 component
 * The A/B test controls the button layout within V2
 */
export const selectTokenDetailsV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2],
    ),
);

/**
 * @deprecated Use selectTokenDetailsLayoutTestVariant for A/B test
 * Keep for backward compatibility during migration
 */
export const selectTokenDetailsV2ButtonsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2Buttons] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2Buttons],
    ),
);
