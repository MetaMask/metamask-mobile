import { useSelector } from 'react-redux';
import { selectDisplayCardButtonFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { selectAlwaysShowCardButton } from '../../../../core/redux/slices/card';

const useIsBaanxLoginEnabled = () => {
  const displayCardButtonFeatureFlag = useSelector(
    selectDisplayCardButtonFeatureFlag,
  );
  const alwaysShowCardButton = useSelector(selectAlwaysShowCardButton);

  // If user has explicitly enabled the experimental switch,
  // they should have full access to the feature including authentication/onboarding,
  // regardless of the progressive rollout flag state
  return alwaysShowCardButton || displayCardButtonFeatureFlag || false;
};

export default useIsBaanxLoginEnabled;
