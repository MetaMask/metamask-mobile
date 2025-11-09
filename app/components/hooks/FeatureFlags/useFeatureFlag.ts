import { useFeatureFlagOverride } from '../../../contexts/FeatureFlagOverrideContext';

export enum FeatureFlagNames {
  rewardsEnabled = 'rewardsEnabled',
  rewardsEnableCardSpend = 'rewardsEnableCardSpend',
  rewardsAnnouncementModalEnabled = 'rewardsAnnouncementModalEnabled',
}

export const useFeatureFlag = (key: FeatureFlagNames) => {
  const { getFeatureFlag } = useFeatureFlagOverride();
  return getFeatureFlag(key);
};
