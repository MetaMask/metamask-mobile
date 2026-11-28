import {
  FeatureFlagNames,
  isMoneyMfaBuildEnabled,
} from '../../../constants/featureFlags';
import { createMfaVersionGatedFlagSelector } from '../mfa/createMfaVersionGatedFlagSelector';

/**
 * Gate for passwordless social recovery: the `mfaRecovery` remote flag
 * (`{ enabled, minimumVersion }`) when valid, otherwise `MM_MONEY_MFA_ENABLED`
 * (default off), the same local fallback as Money MFA. The rehydration screen
 * also requires `mfaUiKit` before it offers recovery.
 */
export const selectMfaRecoveryEnabled = createMfaVersionGatedFlagSelector(
  FeatureFlagNames.mfaRecovery,
  isMoneyMfaBuildEnabled,
);
