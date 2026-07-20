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
  perpsMyxProviderEnabled: mockEnabledPerpsLDFlag,
  perpsDefaultPayTokenWhenNoBalanceEnabled: mockEnabledPerpsLDFlag,
  perpsCompetitionBannerEnabled: mockEnabledPerpsLDFlag,
  perpsAdvancedChartEnabledV2: mockEnabledPerpsLDFlag,
  perpsWatchlistV2Enabled: mockEnabledPerpsLDFlag,
  perpsTerminalBackendEnabled: mockEnabledPerpsLDFlag,
  perpsRecentlyAddedEnabled: mockEnabledPerpsLDFlag,
  perpsShowFullAssetNames: mockEnabledPerpsLDFlag,
  perpsClosePositionLimitOrderEnabled: mockEnabledPerpsLDFlag,
};
