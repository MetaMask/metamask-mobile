import { useSelector } from 'react-redux';
import {
  selectDepositActiveFlag,
  selectDepositMinimumVersionFlag,
} from '../../../../selectors/featureFlagController/deposit';
import { hasMinimumRequiredVersion } from '../../../../util/remoteFeatureFlag';

function useDepositEnabled() {
  const depositMinimumVersionFlag = useSelector(
    selectDepositMinimumVersionFlag,
  );
  const depositActiveFlag = useSelector(selectDepositActiveFlag);

  const isDepositEnabled =
    depositActiveFlag &&
    !!depositMinimumVersionFlag &&
    hasMinimumRequiredVersion(depositMinimumVersionFlag);

  return {
    isDepositEnabled,
  };
}

export default useDepositEnabled;
