import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import type { FeatureFlagNames } from '../../../constants/featureFlags';
import { isMfaDevBuild } from '../../../util/identity/mfa/isMfaDevBuild';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Version-gated MFA remote flag. A valid remote flag wins. When it is missing
 * or invalid, `fallback` decides; that defaults to `isMfaDevBuild()`, which is
 * what `mfaUiKit` uses. `mfaRecovery` falls back to `isMoneyMfaBuildEnabled()`,
 * the same `MM_MONEY_MFA_ENABLED` switch as Money MFA.
 *
 * @param flagName - Remote feature-flag key (`FeatureFlagNames.mfaUiKit`, etc.).
 * @param fallback - Used only when the remote flag is missing or invalid.
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
