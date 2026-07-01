import compareVersions from 'compare-versions';
import packageJson from '../../package.json';

const APP_VERSION = packageJson.version;

/**
 * Stellar accounts feature flag interface - matches extension pattern
 */
export interface StellarAccountsFeatureFlag {
  enabled: boolean;
  minimumVersion: string | null;
}

/**
 * Shared helper to check whether Stellar accounts feature is enabled
 * for a given application version. Keeps background and UI logic in sync.
 * Accepts unknown type to handle JSON parsing from selectors.
 *
 * @param flagValue - The feature flag value from remote config
 * @returns boolean - True if the feature is enabled, false otherwise.
 */
export const isStellarAccountsFeatureEnabled = (flagValue: unknown) => {
  if (!flagValue || !APP_VERSION) {
    return false;
  }

  if (typeof flagValue === 'boolean') {
    return flagValue;
  }

  if (typeof flagValue === 'object' && flagValue !== null) {
    const flag = flagValue as StellarAccountsFeatureFlag;
    const { enabled, minimumVersion } = flag;

    if (!enabled) {
      return false;
    }

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
