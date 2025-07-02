import { createSelector } from 'reselect';
import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import { isProduction } from '../../../../../util/environment';

export interface LaunchDarklyFlag {
  enabled: boolean;
  minimumVersion: string;
}

const hasMinimumRequiredVersion = (minRequiredVersion: string) => {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return compareVersions.compare(currentVersion, minRequiredVersion, '>=');
};

const resolveFlag = (localFlag: boolean, remoteFlag: LaunchDarklyFlag) => {
  if (isProduction()) {
    return (
      Boolean(remoteFlag?.enabled) &&
      hasMinimumRequiredVersion(remoteFlag?.minimumVersion)
    );
  }
  return (
    localFlag ??
    (Boolean(remoteFlag?.enabled) &&
      hasMinimumRequiredVersion(remoteFlag?.minimumVersion))
  );
};

export const selectContentfulCarouselEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFlags): boolean => {
    const localFlag = process.env.MM_CONTENTFUL_CAROUSEL_ENABLED === 'true';
    const remoteFlag =
      remoteFlags?.contentfulCarouselEnabled as unknown as LaunchDarklyFlag;

    return resolveFlag(localFlag, remoteFlag);
  },
);
