import { useSelector } from 'react-redux';
import { useFeatureFlagOverride } from '../../contexts/FeatureFlagOverrideContext';
import { selectBasicFunctionalityEnabled } from '../../selectors/settings';

export enum FeatureFlagNames {
  otaUpdatesEnabled = 'otaUpdatesEnabled',
  rewardsEnableCardSpend = 'rewardsEnableCardSpend',
  rewardsEnableMusdDeposit = 'rewardsEnableMusdDeposit',
  rewardsEnableMusdHolding = 'rewardsEnableMusdHolding',
  cardFeature = 'cardFeature', //remote config
  sampleFeatureCounterEnabled = 'sampleFeatureCounterEnabled',
  bridgeConfigV2 = 'bridgeConfigV2', //remote config
  depositConfig = 'depositConfig', //remote config
  earnPooledStakingEnabled = 'earnPooledStakingEnabled',
  predictTradingEnabled = 'predictTradingEnabled',
  perpsPerpTradingEnabled = 'perpsPerpTradingEnabled',
  confirmationsPay = 'confirmations_pay', //remote config
  carouselBanners = 'carouselBanners',
  fullPageAccountList = 'fullPageAccountList',
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
