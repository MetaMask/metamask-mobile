import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { isMinimumRequiredVersionSupported } from '../../../util/feature-flags';

export const selectTokenDetailsV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2],
    ),
);

/**
 * Evaluates the token-details-v-2-button-layout feature flag.
 * Expects a { enabled, minimumVersion } object from LaunchDarkly.
 * Supports environment variable override (OVERRIDE_REMOTE_FEATURE_FLAGS + TOKEN_DETAILS_V2_BUTTONS_ENABLED).
 */
export const selectTokenDetailsV2ButtonsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (
      process.env.OVERRIDE_REMOTE_FEATURE_FLAGS === 'true' &&
      process.env.TOKEN_DETAILS_V2_BUTTONS_ENABLED === 'true'
    ) {
      return true;
    }

    const flagValue =
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2ButtonLayout] ??
      DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2ButtonLayout];

    if (typeof flagValue !== 'object' || flagValue === null) {
      return false;
    }

    const { enabled, minimumVersion } = flagValue as {
      enabled: boolean;
      minimumVersion: string;
    };

    if (!enabled || !minimumVersion || typeof minimumVersion !== 'string') {
      return false;
    }

    return isMinimumRequiredVersionSupported(minimumVersion);
  },
);
