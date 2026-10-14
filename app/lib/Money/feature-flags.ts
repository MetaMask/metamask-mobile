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
  const remoteFlag = remoteFeatureFlags?.[
    MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME
  ] as VersionGatedFeatureFlag;

  return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
}

/**
 * Checks if Money MFA (MPC-backed 2FA) is enabled.
 * Remote `isMoneyMfaEnabled` takes precedence when valid; otherwise
 * `MM_MONEY_MFA_ENABLED` is used as a local fallback (default off).
 *
 * @param remoteFeatureFlags - The remote feature flags object.
 * @returns True if Money MFA is enabled, false otherwise.
 */
export function isMoneyMfaEnabled(
  remoteFeatureFlags: Record<string, unknown> | undefined,
): boolean {
  const localFlag = process.env.MM_MONEY_MFA_ENABLED === 'true';
  const remoteFlag = remoteFeatureFlags?.[
    IS_MONEY_MFA_ENABLED_FLAG_NAME
  ] as VersionGatedFeatureFlag;

  return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
}
