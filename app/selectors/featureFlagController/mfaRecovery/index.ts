import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Whether passwordless social recovery is offered: the `mfaRecovery` remote
 * flag (`{ enabled, minimumVersion }`) when valid, otherwise the build check,
 * which hides it in production and beta builds.
 */
export const selectMfaRecoveryEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    validatedVersionGatedFeatureFlag(
      remoteFeatureFlags?.[FeatureFlagNames.mfaRecovery],
    ) ?? isMfaDevBuild(),
);
