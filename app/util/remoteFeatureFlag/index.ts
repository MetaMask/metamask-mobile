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

/**
 * Normalizes version-gated remote feature flags from two possible runtime shapes.
 *
 * 1) Direct shape:
 * { enabled: true, minimumVersion: '7.65.0' }
 *
 * 2) Progressive rollout shape :
 * { name: undefined | string, value: { enabled: true, minimumVersion: '7.65.0' } }
 *
 */
const unwrapVersionGatedFeatureFlag = (
  remoteFlag: unknown,
): VersionGatedFeatureFlag | undefined => {
  if (isVersionGatedFeatureFlag(remoteFlag)) {
    return remoteFlag;
  }

  if (
    typeof remoteFlag === 'object' &&
    remoteFlag !== null &&
    'value' in remoteFlag
  ) {
    const wrappedValue = (remoteFlag as { name?: string; value?: unknown })
      .value;
    if (isVersionGatedFeatureFlag(wrappedValue)) {
      return wrappedValue;
    }
  }

  return undefined;
};

export const validatedVersionGatedFeatureFlag = (remoteFlag: unknown) => {
  // If remote flag is overridden, return undefined to trigger caller fallback
  if (isRemoteFeatureFlagOverrideActivated) {
    return undefined;
  }

  // Support both direct flags and progressive rollout wrapper objects
  const normalizedFlag = unwrapVersionGatedFeatureFlag(remoteFlag);

  if (!normalizedFlag) {
    return undefined;
  }

  return (
    normalizedFlag.enabled &&
    hasMinimumRequiredVersion(normalizedFlag.minimumVersion)
  );
};
