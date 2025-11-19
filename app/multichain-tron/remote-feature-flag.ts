import compareVersions from 'compare-versions';
import packageJson from '../../package.json';

const APP_VERSION = packageJson.version;

/**
 * Tron accounts feature flag interface - matches extension pattern
 */
export interface TronAccountsFeatureFlag {
  enabled: boolean;
  minimumVersion: string | null;
}

/**
 * Shared helper to check whether Tron accounts feature is enabled
 * for a given application version. Keeps background and UI logic in sync.
 * Accepts unknown type to handle JSON parsing from selectors.
 *
 * @param flagValue - The feature flag value from remote config
 * @returns boolean - True if the feature is enabled, false otherwise.
 */
export const isTronAccountsFeatureEnabled = (flagValue: unknown) => {
  if (!flagValue || !APP_VERSION) {
    return false;
  }

  // Simple boolean flag
  if (typeof flagValue === 'boolean') {
    return flagValue;
  }

  // Object with enabled and minimumVersion properties
  if (typeof flagValue === 'object' && flagValue !== null) {
    const flag = flagValue as TronAccountsFeatureFlag;
    const { enabled, minimumVersion } = flag;

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
  }

  return false;
};
