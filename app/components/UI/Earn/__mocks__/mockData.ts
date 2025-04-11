import {
  PoolStakingRemoteFeatureFlags,
  StablecoinLendingRemoteFeatureFlags,
} from '../../../../selectors/featureFlagController/earnFeatureFlags/types';

const mockedPooledStakingFeatureFlagState: PoolStakingRemoteFeatureFlags = {
  earnPooledStakingEnabled: true,
  earnPooledStakingServiceInterruptionBannerEnabled: true,
};

const mockedStablecoinLendingFeatureFlagState: StablecoinLendingRemoteFeatureFlags =
  {
    earnStablecoinLendingEnabled: true,
    earnStablecoinLendingServiceInterruptionBannerEnabled: true,
  };

export const mockedEarnFeatureFlagsEnabledState = {
  ...mockedPooledStakingFeatureFlagState,
  ...mockedStablecoinLendingFeatureFlagState,
};
