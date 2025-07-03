import { createSelector } from 'reselect';
import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';

export interface LaunchDarklyFlag {
  enabled: boolean;
  minimumVersion: string;
}

const hasMinimumRequiredVersion = (minRequiredVersion: string) => {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return compareVersions.compare(currentVersion, minRequiredVersion, '>=');
};

const resolveFlag = (localFlag: boolean, remoteFlag: LaunchDarklyFlag) =>
  localFlag ||
  (Boolean(remoteFlag?.enabled) &&
    hasMinimumRequiredVersion(remoteFlag?.minimumVersion));

export const selectContentfulCarouselEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags): boolean => {
    const localFlag = process.env.MM_CONTENTFUL_CAROUSEL_ENABLED === 'true';
    const remoteFlag =
      remoteFlags?.contentfulCarouselIntegration as unknown as LaunchDarklyFlag;

    return resolveFlag(localFlag, remoteFlag);
  },
);
