import { isMoneyMfaBuildEnabled } from '../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../util/remoteFeatureFlag';

export const MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME = 'moneyEnableMoneyAccount';

export const IS_MONEY_MFA_ENABLED_FLAG_NAME = 'isMoneyMfaEnabled';

/**
 * Checks if the Money account feature is enabled based on
 * environment variables and remote feature flags.
 *
 * @param remoteFeatureFlags - The remote feature flags object.
 * @returns True if the Money account feature is enabled, false otherwise.
 */
export function isMoneyAccountEnabled(
  remoteFeatureFlags: Record<string, unknown> | undefined,
): boolean {
  // Agentic/test-only fallback: only read in dev builds so a stray env var
  // can never enable Money in a release build.
  const agenticLocalTestFlag =
    __DEV__ && process.env.MM_AGENTIC_TEST_MONEY_ACCOUNT_ENABLED === 'true';
  const remoteFlag = remoteFeatureFlags?.[
    MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME
  ] as VersionGatedFeatureFlag;

  return validatedVersionGatedFeatureFlag(remoteFlag) ?? agenticLocalTestFlag;
}

/**
 * Checks if Money MFA (MPC-backed 2FA) is enabled.
 * Remote `isMoneyMfaEnabled` takes precedence when valid; otherwise
 * `MM_MONEY_MFA_ENABLED` is the local fallback (default off). The same local
 * flag is the fallback for social-login MFA recovery.
 *
 * @param remoteFeatureFlags - The remote feature flags object.
 * @returns True if Money MFA is enabled, false otherwise.
 */
export function isMoneyMfaEnabled(
  remoteFeatureFlags: Record<string, unknown> | undefined,
): boolean {
  const remoteFlag = remoteFeatureFlags?.[
    IS_MONEY_MFA_ENABLED_FLAG_NAME
  ] as VersionGatedFeatureFlag;

  return (
    validatedVersionGatedFeatureFlag(remoteFlag) ?? isMoneyMfaBuildEnabled()
  );
}
