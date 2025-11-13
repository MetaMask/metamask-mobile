import { useSelector } from 'react-redux';
import { useFeatureFlagOverride } from '../../../contexts/FeatureFlagOverrideContext';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';

export enum FeatureFlagNames {
  rewardsEnabled = 'rewardsEnabled',
  rewardsEnableCardSpend = 'rewardsEnableCardSpend',
  rewardsAnnouncementModalEnabled = 'rewardsAnnouncementModalEnabled',
}

export const useFeatureFlag = (key: FeatureFlagNames) => {
  const { getFeatureFlag } = useFeatureFlagOverride();
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );
  if (!isBasicFunctionalityEnabled) {
    return false;
  }
  return getFeatureFlag(key);
};
