import { createSelector } from 'reselect';
import compareVersions from 'compare-versions';
import packageJson from '../../../../package.json';
import { selectRemoteFeatureFlags } from '..';

const APP_VERSION = packageJson.version;

/**
 * Bitcoin accounts feature flag
 */
export interface BitcoinAccountsFeatureFlag {
  enabled: boolean;
  minimumVersion: string;
}

/**
 * Asserts that the given value is a valid BitcoinAccountsFeatureFlag.
 * @param value - The value to check.
 * @returns True if the value is a valid BitcoinAccountsFeatureFlag, false otherwise.
 */
export const assertBitcoinAccountsFeatureFlagType = (
  value: unknown,
): value is BitcoinAccountsFeatureFlag =>
  typeof value === 'object' &&
  value !== null &&
  'enabled' in value &&
  typeof value.enabled === 'boolean' &&
  'minimumVersion' in value &&
  typeof value.minimumVersion === 'string';

/**
 * Selector to check if the bitcoinAccounts feature flag is enabled.
 * This flag controls whether Bitcoin provider is available for account creation.
 * It checks both if the flag is enabled and if the current app version meets the minimum version requirement.
 */
export const selectIsBitcoinAccountsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const bitcoinAccountsFlag = remoteFeatureFlags.bitcoinAccounts;

    if (!assertBitcoinAccountsFeatureFlagType(bitcoinAccountsFlag)) {
      return false;
    }

    const { enabled, minimumVersion } = bitcoinAccountsFlag;

    if (!enabled) {
      return false;
    }

    return compareVersions.compare(minimumVersion, APP_VERSION, '<=');
  },
);
