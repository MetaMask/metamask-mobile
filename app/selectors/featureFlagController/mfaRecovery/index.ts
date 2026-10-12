import { hasProperty } from '@metamask/utils';
import { createSelector } from 'reselect';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/** Returns whether MFA recovery is enabled for the current app version. */
export const selectMfaRecoveryEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (!hasProperty(remoteFeatureFlags, FeatureFlagNames.mfaRecovery)) {
      return false;
    }

    return (
      validatedVersionGatedFeatureFlag(
        remoteFeatureFlags[
          FeatureFlagNames.mfaRecovery
        ] as unknown as VersionGatedFeatureFlag,
      ) ?? false
    );
  },
);
