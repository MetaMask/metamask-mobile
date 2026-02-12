import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

export const selectTokenDetailsV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2],
    ),
);

/**
 * Evaluates the tokenDetailsV2ButtonLayout feature flag.
 * Handles both the direct shape { enabled, minimumVersion } and
 * the progressive rollout shape { name, value: { enabled, minimumVersion } }.
 * Uses the shared validatedVersionGatedFeatureFlag utility.
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
