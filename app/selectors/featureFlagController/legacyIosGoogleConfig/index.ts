import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { getFeatureFlagValue } from '../env';
import { selectRemoteFeatureFlags } from '..';

export const DEFAULT_LEGACY_IOS_GOOGLE_CONFIG_ENABLED = true;
export const LEGACY_IOS_GOOGLE_CONFIG_ENV_VAR =
  'MM_LEGACY_IOS_GOOGLE_CONFIG_ENABLED';

export const selectLegacyIosGoogleConfigEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteValue = hasProperty(
      remoteFeatureFlags,
      FeatureFlagNames.legacyIosGoogleConfigEnabled,
    )
      ? Boolean(
          remoteFeatureFlags[FeatureFlagNames.legacyIosGoogleConfigEnabled],
        )
      : DEFAULT_LEGACY_IOS_GOOGLE_CONFIG_ENABLED;

    return getFeatureFlagValue(
      process.env[LEGACY_IOS_GOOGLE_CONFIG_ENV_VAR],
      remoteValue,
    );
  },
);
