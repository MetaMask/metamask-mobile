import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../util/remoteFeatureFlag';

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
