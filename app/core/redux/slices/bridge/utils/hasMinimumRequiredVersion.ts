import compareVersions from 'compare-versions';
import { getVersion } from 'react-native-device-info';

export const hasMinimumRequiredVersion = (
  minRequiredVersion: string | undefined,
) => {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return compareVersions.compare(currentVersion, minRequiredVersion, '>=');
};
