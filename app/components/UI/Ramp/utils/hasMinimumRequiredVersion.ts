import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';

/**
 * Checks if the current app version meets the minimum required version
 * and the feature is enabled.
 *
 * @param minRequiredVersion - The minimum version required for the feature
 * @param isFeatureEnabled - Whether the feature is enabled via remote flag
 * @returns true if the feature is enabled AND current version >= minimum version
 */
export function hasMinimumRequiredVersion(
  minRequiredVersion: string | null | undefined,
  isFeatureEnabled: boolean,
): boolean {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return (
    isFeatureEnabled &&
    compareVersions.compare(currentVersion, minRequiredVersion, '>=')
  );
}
