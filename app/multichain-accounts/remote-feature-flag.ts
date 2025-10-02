import compareVersions from 'compare-versions';
import packageJson from '../../package.json';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import Engine from '../core/Engine';

/**
 * Multichain accounts feature flag
 */
export interface MultichainAccountsFeatureFlag {
  enabled: boolean;
  featureVersion: string | null;
  minimumVersion: string | null;
}

const APP_VERSION = packageJson.version;
const enableMultichainAccountsState2Local =
  process.env.MM_ENABLE_MULTICHAIN_ACCOUNTS_STATE_2;

export const MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1 = '1';
export const MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2 = '2';

export const STATE_1_FLAG = 'enableMultichainAccounts';
export const STATE_2_FLAG = 'enableMultichainAccountsState2';
/**
 * Asserts that the given value is a valid MultichainAccountsFeatureFlag.
 * @param value - The value to check.
 * @returns True if the value is a valid MultichainAccountsFeatureFlag, false otherwise.
 */
export const assertMultichainAccountsFeatureFlagType = (
  value: unknown,
): value is MultichainAccountsFeatureFlag =>
  typeof value === 'object' &&
  value !== null &&
  'enabled' in value &&
  typeof value.enabled === 'boolean' &&
  'featureVersion' in value &&
  (typeof value.featureVersion === 'string' || value.featureVersion === null) &&
  'minimumVersion' in value &&
  (typeof value.minimumVersion === 'string' || value.minimumVersion === null);

/**
 * Checks if the multichain accounts feature is enabled based on remote feature flags.
 *
 * @param remoteFeatureFlags - The remote feature flags to check against.
 * @param featureVersionToCheck - The version of the feature to check against.
 * @returns True if the multichain accounts feature is enabled for any specified versions, false otherwise.
 */
export const isMultichainAccountsRemoteFeatureEnabled = (
  remoteFeatureFlags: FeatureFlags,
  featureVersionsToCheck: {
    version: string;
    featureKey: keyof FeatureFlags;
  }[],
  override?: string,
): boolean => {
  const overrideForVersion2 =
    override !== undefined &&
    featureVersionsToCheck.some(
      ({ version }) => version === MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
    );

  if (overrideForVersion2) {
    return override === 'true';
  }

  for (const { version, featureKey } of featureVersionsToCheck) {
    const featureFlag = remoteFeatureFlags[featureKey];

    if (!assertMultichainAccountsFeatureFlagType(featureFlag)) {
      return true;
    }

    const { enabled, featureVersion, minimumVersion } = featureFlag;

    return (
      enabled &&
      minimumVersion !== null &&
      featureVersion === version &&
      compareVersions.compare(minimumVersion, APP_VERSION, '<=')
    );
  }

  return true;
};

/**
 * Get remote feature flags from its controller's state.
 */
function getRemoteFeatureFlags(): FeatureFlags {
  return Engine.context.RemoteFeatureFlagController.state.remoteFeatureFlags;
}

/**
 * Checks if multichain accounts state 1 is enabled.
 * Returns true if the feature is enabled for state 1 or state 2.
 */
export const isMultichainAccountsState1Enabled = () =>
  isMultichainAccountsRemoteFeatureEnabled(getRemoteFeatureFlags(), [
    {
      version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
      featureKey: STATE_1_FLAG,
    },
    {
      version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
      featureKey: STATE_2_FLAG,
    },
  ]);

/**
 * Checks if multichain accounts state 2 is enabled.
 * @returns Boolean indicating if multichain accounts state 2 is enabled.
 */
export const isMultichainAccountsState2Enabled = () =>
  isMultichainAccountsRemoteFeatureEnabled(
    getRemoteFeatureFlags(),
    [
      {
        version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
        featureKey: STATE_2_FLAG,
      },
    ],
    enableMultichainAccountsState2Local,
  );
