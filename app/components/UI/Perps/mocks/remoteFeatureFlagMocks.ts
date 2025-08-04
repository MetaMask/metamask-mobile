import { PerpsLaunchDarklyFlag } from '../types';

const mockEnabledPerpsLDFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
};

export const mockedPerpsFeatureFlagsEnabledState: Record<
  string,
  PerpsLaunchDarklyFlag
> = {
  perpsPerpTradingEnabled: mockEnabledPerpsLDFlag,
  perpsPerpTradingServiceInterruptionBannerEnabled: mockEnabledPerpsLDFlag,
};
