import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../util/remoteFeatureFlag';

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
  const localFlag = process.env.MM_MONEY_ENABLE_MONEY_ACCOUNT === 'true';
  const remoteFlag =
    remoteFeatureFlags?.moneyEnableMoneyAccount as VersionGatedFeatureFlag;

  return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
}
