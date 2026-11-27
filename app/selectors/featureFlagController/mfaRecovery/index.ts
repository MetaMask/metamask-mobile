import { FeatureFlagNames } from '../../../constants/featureFlags';
import { createMfaVersionGatedFlagSelector } from '../mfa/createMfaVersionGatedFlagSelector';

/**
 * Whether passwordless social recovery is offered: the `mfaRecovery` remote
 * flag (`{ enabled, minimumVersion }`) when valid, otherwise the build check,
 * which hides it in production and beta builds.
 */
export const selectMfaRecoveryEnabled = createMfaVersionGatedFlagSelector(
  FeatureFlagNames.mfaRecovery,
);
