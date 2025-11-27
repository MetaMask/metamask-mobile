import compareVersions from 'compare-versions';
import { getVersion } from 'react-native-device-info';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/remote-feature-flag-controller';

export interface VersionGatedFeatureFlag {
  enabled: boolean;
  minimumVersion: string;
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
