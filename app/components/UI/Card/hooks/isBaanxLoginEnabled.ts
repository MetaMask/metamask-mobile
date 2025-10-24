import { useSelector } from 'react-redux';
import { selectDisplayCardButtonFeatureFlag } from '../../../../selectors/featureFlagController/card';

const useIsBaanxLoginEnabled = () => {
  const displayCardButtonFeatureFlag = useSelector(
    selectDisplayCardButtonFeatureFlag,
  );

  return displayCardButtonFeatureFlag ?? false;
};

export default useIsBaanxLoginEnabled;
