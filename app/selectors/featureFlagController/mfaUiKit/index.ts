import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Whether the MFA screens are reachable: the `mfaUiKit` remote flag
 * (`{ enabled, minimumVersion }`) when valid, otherwise the build check, which
 * hides them in production and beta builds.
 */
export const selectMfaUiKitEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    validatedVersionGatedFeatureFlag(
      remoteFeatureFlags?.[FeatureFlagNames.mfaUiKit],
    ) ?? isMfaDevBuild(),
);
