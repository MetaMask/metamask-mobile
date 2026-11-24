import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevRecoveryBuild } from '../../../core/MfaRecovery/isMfaDevRecoveryBuild';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Whether passwordless social recovery is offered: the `mfaRecovery` remote
 * flag (`{ enabled, minimumVersion }`) when valid, otherwise the build check,
 * which enables it only in explicit dev builds (`dev`, `local`, `test`).
 */
export const selectMfaRecoveryEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    validatedVersionGatedFeatureFlag(
      remoteFeatureFlags?.[FeatureFlagNames.mfaRecovery],
    ) ?? isMfaDevRecoveryBuild(),
);
