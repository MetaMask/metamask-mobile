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
  const remoteFlag =
    remoteFeatureFlags?.moneyEnableMoneyAccount as VersionGatedFeatureFlag;

  let enabled = false;
  enabled ||= process.env.MM_MONEY_ENABLE_MONEY_ACCOUNT === 'true';
  enabled ||= validatedVersionGatedFeatureFlag(remoteFlag) ?? false;

  return enabled;
}
