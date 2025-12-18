import { useSelector } from 'react-redux';
import { useFeatureFlagOverride } from '../../contexts/FeatureFlagOverrideContext';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';

export enum FeatureFlagNames {
  rewardsEnabled = 'rewardsEnabled',
  otaUpdatesEnabled = 'otaUpdatesEnabled',
  rewardsEnableMusdHolding = 'rewardsEnableMusdHolding',
  fullPageAccountList = 'fullPageAccountList',
  importSrpWordSuggestion = 'importSrpWordSuggestion',
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
