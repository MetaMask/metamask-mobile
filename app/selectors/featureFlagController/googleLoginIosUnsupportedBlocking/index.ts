import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { getFeatureFlagValue } from '../env';
import { selectRemoteFeatureFlags } from '..';

/**
 * When true, Google login on iOS below 17.4 shows a blocking login error and does not start OAuth.
 * When false, the existing warning sheet is shown and login may proceed after dismissal.
 */
export const DEFAULT_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED = false;

export const selectGoogleLoginIosUnsupportedBlockingEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteValue = hasProperty(
      remoteFeatureFlags,
      FeatureFlagNames.googleLoginIosUnsupportedBlockingEnabled,
    )
      ? Boolean(
          remoteFeatureFlags[
            FeatureFlagNames.googleLoginIosUnsupportedBlockingEnabled
          ],
        )
      : DEFAULT_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED;
    return getFeatureFlagValue(
      process.env.MM_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED,
      remoteValue,
    );
  },
);
