import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../util/remoteFeatureFlag';

export const MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME = 'moneyEnableMoneyAccount';

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
