import compareVersions from 'compare-versions';
import packageJson from '../../package.json';

const APP_VERSION = packageJson.version;

/**
 * Bitcoin accounts feature flag interface - matches extension pattern
 */
export interface BitcoinAccountsFeatureFlag {
  enabled: boolean;
  minimumVersion: string | null;
}

/**
 * Shared helper to check whether Bitcoin accounts feature is enabled
 * for a given application version. Keeps background and UI logic in sync.
 *
 * @param bitcoinAccountsFlag - The Bitcoin accounts feature flag.
 * @returns boolean - True if the feature is enabled, false otherwise.
 */
export const isBitcoinAccountsFeatureEnabled = (
  bitcoinAccountsFlag: BitcoinAccountsFeatureFlag | undefined | null,
) => {
  if (!bitcoinAccountsFlag || !APP_VERSION) {
    return false;
  }

  const { enabled, minimumVersion } = bitcoinAccountsFlag;

  if (!enabled) {
    return false;
  }

  // Require version for safety (following multichain-accounts pattern)
  if (!minimumVersion) {
    return false;
  }

  try {
    return compareVersions.compare(minimumVersion, APP_VERSION, '<=');
  } catch {
    return false;
  }
};

/**
 * Type guard to check if value is a valid BitcoinAccountsFeatureFlag
 */
export const isBitcoinAccountsFeatureFlagType = (
  value: unknown,
): value is BitcoinAccountsFeatureFlag =>
  typeof value === 'object' &&
  value !== null &&
  'enabled' in value &&
  typeof value.enabled === 'boolean' &&
  'minimumVersion' in value &&
  (typeof value.minimumVersion === 'string' || value.minimumVersion === null);
