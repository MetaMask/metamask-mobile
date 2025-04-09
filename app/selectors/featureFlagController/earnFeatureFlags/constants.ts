import type {
  PoolStakingRemoteFeatureFlags,
  StablecoinLendingRemoteFeatureFlags,
} from './types';

const mockedPooledStakingFeatureFlagState: PoolStakingRemoteFeatureFlags = {
  earnPooledStakingEnabled: true,
  earnPooledStakingServiceInterruptionBannerEnabled: true,
};

const mockedStablecoinLendingFeatureFlagState: StablecoinLendingRemoteFeatureFlags =
  {
    earnStablecoinLendingEnabled: true,
    earnStablecoinLendingServiceInterruptionBannerEnabled: true,
  };

export const mockedEarnFeatureFlagState = {
  ...mockedPooledStakingFeatureFlagState,
  ...mockedStablecoinLendingFeatureFlagState,
};
