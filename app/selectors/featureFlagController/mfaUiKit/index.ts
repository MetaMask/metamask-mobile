import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import type { MfaMethod } from '../../../util/identity/mfa/engine/types';
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

const ALL_METHODS: MfaMethod[] = ['passkey', 'totp', 'email_otp'];

/**
 * Methods users may add in the MFA settings: the `mfaUiKit` flag's `methods`,
 * or all of them. Methods already set up stay listed.
 */
export const selectMfaUiKitMethods = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): MfaMethod[] => {
    const flag = remoteFeatureFlags?.[FeatureFlagNames.mfaUiKit] as
      | { methods?: unknown; value?: { methods?: unknown } }
      | undefined;
    // A progressive rollout wraps the value as `{ name, value }`.
    const methods = flag?.methods ?? flag?.value?.methods;
    return Array.isArray(methods) ? (methods as MfaMethod[]) : ALL_METHODS;
  },
);
