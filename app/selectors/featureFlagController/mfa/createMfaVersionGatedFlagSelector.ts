import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import type { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { isMfaForceDisabled } from '../../../util/identity/mfa/isMfaForceDisabled';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Version-gated MFA remote flag with the shared `isMfaDevBuild()` fallback.
 * Used by `mfaUiKit` / `mfaRecovery` so the gate + fallback stay in sync.
 *
 * `MM_MFA_DISABLED` wins over the remote flag so a build can keep MFA off.
 *
 * @param flagName - Remote feature-flag key (`FeatureFlagNames.mfaUiKit`, etc.).
 * @returns Selector that resolves to whether that MFA surface is enabled.
 */
export const createMfaVersionGatedFlagSelector = (flagName: FeatureFlagNames) =>
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags): boolean => {
    if (isMfaForceDisabled()) {
      return false;
    }

    return (
      validatedVersionGatedFeatureFlag(remoteFeatureFlags?.[flagName]) ??
      isMfaDevBuild()
    );
  });
