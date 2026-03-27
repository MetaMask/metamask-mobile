import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

/**
 * Multichain accounts feature flag
 */
export interface MultichainAccountsFeatureFlag {
  enabled: boolean;
  featureVersion: string | null;
  minimumVersion: string | null;
}

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
 * Multichain accounts is permanently enabled. The remote feature flag is no longer required.
 * @returns Always true.
 */
export const isMultichainAccountsRemoteFeatureEnabled = (
  _remoteFeatureFlags: FeatureFlags,
  _featureVersionsToCheck: {
    version: string;
    featureKey: keyof FeatureFlags;
  }[],
  _override?: string,
): boolean => true;

/**
 * Checks if multichain accounts state 2 is enabled.
 * @returns Always true — the feature is permanently enabled.
 */
export const isMultichainAccountsState2Enabled = (): boolean => true;
