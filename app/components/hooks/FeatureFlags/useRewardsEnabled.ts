import { FeatureFlagNames } from '../../../selectors/featureFlagController';
import { useFeatureFlagOverride } from '../../../contexts/FeatureFlagOverrideContext';

export const useRewardsEnabled = () => {
  const { getFeatureFlag } = useFeatureFlagOverride();
  return getFeatureFlag(FeatureFlagNames.rewardsEnabled);
};
