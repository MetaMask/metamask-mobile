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

const APP_VERSION = packageJson.version; // Current app version
const enableMultichainAccountsState2Local =
  process.env.MM_ENABLE_MULTICHAIN_ACCOUNTS_STATE_2;

const STATE_1_FLAG = 'enableMultichainAccounts';
const STATE_2_FLAG = 'enableMultichainAccountsState2';

export const MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1 = '1';
export const MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2 = '2';

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
 * Get remote feature flags from its controller's state.
 */
function getRemoteFeatureFlags(): FeatureFlags {
  return Engine.context.RemoteFeatureFlagController.state.remoteFeatureFlags;
}

/**
 * Generic function to check if a multichain account feature is enabled.
 * @param featureKey - The key of the feature flag in remote feature flags.
 * @param targetFeatureVersion - The specific feature version to check.
 * @param override - An optional override value (applicable only to state 2).
 * @returns Boolean indicating if the feature is enabled.
 */
function isMultichainAccountStateEnabled(
  featureKey: keyof FeatureFlags,
  targetFeatureVersion: string,
  override?: string,
): boolean {
  // Use the override for state 2, if applicable
  if (
    override !== undefined &&
    targetFeatureVersion === MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2
  ) {
    return override === 'true';
  }

  const remoteFeatureFlags = getRemoteFeatureFlags();
  const enableMultichainAccounts = remoteFeatureFlags[featureKey];

  if (
    !enableMultichainAccounts ||
    !assertMultichainAccountsFeatureFlagType(enableMultichainAccounts)
  ) {
    return true; // Assume feature is enabled if we fail to get remote feature flags
  }

  const { enabled, featureVersion, minimumVersion } = enableMultichainAccounts;
  if (!enabled || !minimumVersion || !featureVersion) {
    return true; // Assume feature is enabled if required fields are missing
  }

  return (
    featureVersion === targetFeatureVersion &&
    compareVersions.compare(minimumVersion, APP_VERSION, '<=')
  );
}

/**
 * Check if multichain accounts state 1 is enabled.
 * @returns Boolean indicating if multichain accounts state 1 is enabled.
 */
export const isMultichainAccountsState1Enabled = () =>
  isMultichainAccountStateEnabled(
    STATE_1_FLAG,
    MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
  );

/**
 * Check if multichain accounts state 2 is enabled.
 * @returns Boolean indicating if multichain accounts state 2 is enabled.
 */
export const isMultichainAccountsState2Enabled = () =>
  isMultichainAccountStateEnabled(
    STATE_2_FLAG,
    MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
    enableMultichainAccountsState2Local,
  );
