import { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

const mockEnabledPerpsLDFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
};

export const mockedPerpsFeatureFlagsEnabledState: Record<
  string,
  VersionGatedFeatureFlag
> = {
  perpsPerpTradingEnabled: mockEnabledPerpsLDFlag,
  perpsPerpTradingServiceInterruptionBannerEnabled: mockEnabledPerpsLDFlag,
  perpsOrderBookEnabled: mockEnabledPerpsLDFlag,
  perpsFeedbackEnabled: mockEnabledPerpsLDFlag,
};
