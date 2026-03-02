import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

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

    if (typeof remoteFlag === 'object' && 'value' in remoteFlag) {
      const { variant, minimumVersion } = remoteFlag.value as {
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
