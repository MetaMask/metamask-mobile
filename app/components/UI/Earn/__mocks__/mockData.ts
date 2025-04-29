import { EarnLaunchDarklyFlag } from '../selectors/featureFlags/types';

const mockEnabledEarnLDFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
};

const mockedPooledStakingFeatureFlagState: Record<
  string,
  EarnLaunchDarklyFlag
> = {
  earnPooledStakingEnabled: mockEnabledEarnLDFlag,
  earnPooledStakingServiceInterruptionBannerEnabled: mockEnabledEarnLDFlag,
};

const mockedStablecoinLendingFeatureFlagState: Record<
  string,
  EarnLaunchDarklyFlag
> = {
  earnStablecoinLendingEnabled: mockEnabledEarnLDFlag,
  earnStablecoinLendingServiceInterruptionBannerEnabled: mockEnabledEarnLDFlag,
};

export const mockedEarnFeatureFlagsEnabledState = {
  ...mockedPooledStakingFeatureFlagState,
  ...mockedStablecoinLendingFeatureFlagState,
};
