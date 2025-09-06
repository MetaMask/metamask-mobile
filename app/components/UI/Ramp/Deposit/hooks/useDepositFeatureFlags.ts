import { useSelector } from 'react-redux';

import { selectDepositFeatures } from '../../../../../selectors/featureFlagController/deposit';

interface DepositFeatures {
  metamaskUsdEnabled?: boolean | null;
}

function useDepositFeatureFlags() {
  const features: DepositFeatures = useSelector(selectDepositFeatures);

  return features;
}

export default useDepositFeatureFlags;
