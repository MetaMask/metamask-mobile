import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import type { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Version-gated MFA remote flag with the shared `isMfaDevBuild()` fallback.
 * Used by `mfaUiKit` / `mfaRecovery` so the gate + fallback stay in sync.
 *
 * @param flagName - Remote feature-flag key (`FeatureFlagNames.mfaUiKit`, etc.).
 * @returns Selector that resolves to whether that MFA surface is enabled.
 */
export const createMfaVersionGatedFlagSelector = (flagName: FeatureFlagNames) =>
  createSelector(
    selectRemoteFeatureFlags,
    (remoteFeatureFlags): boolean =>
      validatedVersionGatedFeatureFlag(remoteFeatureFlags?.[flagName]) ??
      isMfaDevBuild(),
  );
