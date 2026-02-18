import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  hasMinimumRequiredVersion,
} from '../../../util/remoteFeatureFlag';

// Valid variants for the layout A/B test
const VALID_LAYOUT_VARIANTS = ['control', 'treatment'] as const;
type LayoutVariant = (typeof VALID_LAYOUT_VARIANTS)[number];

const isValidVariant = (value: unknown): value is LayoutVariant =>
  typeof value === 'string' &&
  VALID_LAYOUT_VARIANTS.includes(value as LayoutVariant);

/**
 * Selector for Token Details Layout A/B test variant.
 *
 * Reads the version-gated JSON flag from LaunchDarkly:
 * { "variant": "control"|"treatment", "minimumVersion": "7.66.0" }
 *
 * Returns null when the test is inactive (flag unset, invalid, or version gate fails).
 */
export const selectTokenDetailsLayoutTestVariant = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string | null => {
    const remoteFlag = remoteFeatureFlags?.tokenDetailsV2AbTest;

    if (!remoteFlag) {
      return null;
    }

    // Version-gated JSON { variant, minimumVersion }
    if (typeof remoteFlag === 'object' && 'variant' in remoteFlag) {
      const { variant, minimumVersion } = remoteFlag as {
        variant: unknown;
        minimumVersion: unknown;
      };
      if (
        typeof minimumVersion === 'string' &&
        !hasMinimumRequiredVersion(minimumVersion)
      ) {
        return null;
      }
      return isValidVariant(variant) ? variant : null;
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
  (remoteFeatureFlags): boolean => {
    if (process.env.OVERRIDE_REMOTE_FEATURE_FLAGS === 'true') {
      return process.env.TOKEN_DETAILS_V2_BUTTONS_ENABLED === 'true';
    }

    const remoteFlag =
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2ButtonLayout] ??
      DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2ButtonLayout];

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
