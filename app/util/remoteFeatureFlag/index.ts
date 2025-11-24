import compareVersions from 'compare-versions';
import { getVersion } from 'react-native-device-info';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/remote-feature-flag-controller';

export interface VersionGatedFeatureFlag {
  enabled: boolean;
  minimumVersion: string;
}

/**
 * Type guard to check if a value is a VersionGatedFeatureFlag
 * Useful for narrowing types before accessing flag properties
 *
 * @param value - The value to check
 * @returns True if the value is a valid VersionGatedFeatureFlag structure
 */
export function isVersionGatedFeatureFlag(
  value: unknown,
): value is VersionGatedFeatureFlag {
  return (
    typeof value === 'object' &&
    value !== null &&
    'enabled' in value &&
    'minimumVersion' in value &&
    typeof (value as { enabled: unknown }).enabled === 'boolean' &&
    typeof (value as { minimumVersion: unknown }).minimumVersion === 'string'
  );
}

export const hasMinimumRequiredVersion = (minRequiredVersion: string) => {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return compareVersions.compare(currentVersion, minRequiredVersion, '>=');
};

export const validatedVersionGatedFeatureFlag = (
  remoteFlag: VersionGatedFeatureFlag,
) => {
  // If failed to fetch remote flag or flag is overridden or misconfigured return undefined to trigger fallback
  if (
    isRemoteFeatureFlagOverrideActivated ||
    !remoteFlag ||
    typeof remoteFlag.enabled !== 'boolean' ||
    typeof remoteFlag.minimumVersion !== 'string'
  ) {
    return undefined;
  }

  return (
    remoteFlag.enabled && hasMinimumRequiredVersion(remoteFlag.minimumVersion)
  );
};
