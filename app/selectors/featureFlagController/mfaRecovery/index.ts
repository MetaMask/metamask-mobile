import {
  FeatureFlagNames,
  isMoneyMfaBuildEnabled,
} from '../../../constants/featureFlags';
import { createMfaVersionGatedFlagSelector } from '../mfa/createMfaVersionGatedFlagSelector';

/**
 * Whether passwordless social recovery is offered. A valid `mfaRecovery`
 * remote flag (`{ enabled, minimumVersion }`) decides it. When that flag is
 * missing or invalid, `MM_MONEY_MFA_ENABLED` is the fallback (default off) —
 * the same local switch as Money MFA.
 */
export const selectMfaRecoveryEnabled = createMfaVersionGatedFlagSelector(
  FeatureFlagNames.mfaRecovery,
  isMoneyMfaBuildEnabled,
);
