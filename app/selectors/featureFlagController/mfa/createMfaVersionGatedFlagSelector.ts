import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import type { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Version-gated MFA remote flag. A valid remote flag wins, including a
 * disabled one. `fallback` decides only when the flag is missing or invalid,
 * or `OVERRIDE_REMOTE_FEATURE_FLAGS=true`.
 *
 * @param flagName - Remote feature-flag key (`FeatureFlagNames.mfaUiKit`, etc.).
 * @param fallback - Value when the remote flag does not decide. Defaults to
 * `isMfaDevBuild()`, which is off in production and beta builds.
 * @returns Selector that resolves to whether that MFA surface is enabled.
 */
export const createMfaVersionGatedFlagSelector = (
  flagName: FeatureFlagNames,
  fallback: () => boolean = isMfaDevBuild,
) =>
  createSelector(
    selectRemoteFeatureFlags,
    (remoteFeatureFlags): boolean =>
      validatedVersionGatedFeatureFlag(remoteFeatureFlags?.[flagName]) ??
      fallback(),
  );
