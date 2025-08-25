import { useSelector } from 'react-redux';
import { getVersion } from 'react-native-device-info';
import compareVersions from 'compare-versions';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../../selectors/featureFlagController/deposit';

function hasMinimumRequiredVersion(
  minRequiredVersion: string | null | undefined,
  isDepositEnabled: boolean,
) {
  if (!minRequiredVersion) return false;
  const currentVersion = getVersion();
  return (
    isDepositEnabled &&
    compareVersions.compare(currentVersion, minRequiredVersion, '>=')
  );
}

function useDepositEnabled() {
  const depositMinimumVersionFlag = useSelector(
    selectDepositMinimumVersionFlag,
  );
  const depositActiveFlag = useSelector(selectDepositActiveFlag);

  const isDepositEnabled = hasMinimumRequiredVersion(
    depositMinimumVersionFlag,
    depositActiveFlag,
  );

  return {
    isDepositEnabled,
  };
}

export default useDepositEnabled;
