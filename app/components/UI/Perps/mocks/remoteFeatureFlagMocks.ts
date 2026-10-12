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
  perpsDefaultPayTokenWhenNoBalanceEnabled: mockEnabledPerpsLDFlag,
  perpsCompetitionBannerEnabled: mockEnabledPerpsLDFlag,
  perpsAdvancedChartEnabledV2: mockEnabledPerpsLDFlag,
  perpsWatchlistV2Enabled: mockEnabledPerpsLDFlag,
  perpsProModeEnabled: mockEnabledPerpsLDFlag,
  perpsMobileTwap: mockEnabledPerpsLDFlag,
  perpsMobileScale: mockEnabledPerpsLDFlag,
  perpsPositionModifyPreviewEnabled: mockEnabledPerpsLDFlag,
  perpsMobileChase: mockEnabledPerpsLDFlag,
  perpsTerminalBackendEnabled: mockEnabledPerpsLDFlag,
  perpsRecentlyAddedEnabled: mockEnabledPerpsLDFlag,
  perpsShowFullAssetNames: mockEnabledPerpsLDFlag,
  perpsClosePositionLimitOrderEnabled: mockEnabledPerpsLDFlag,
  perpsCrossMarginEnabled: mockEnabledPerpsLDFlag,
  perpsPriceAlertsEnabled: mockEnabledPerpsLDFlag,
};

/**
 * Dark-launch value for TAT-3793. Control is served to 100% (threshold 1)
 * and treatment to 0% until the experiment moves to 50/50.
 */
export const mockedPerpsHomeExploreAbTestFlag = {
  tatTAT3793AbtestPerpsHomeExplore: {
    versions: {
      '8.17.0': [
        {
          scope: { type: 'threshold' as const, value: 1 },
          thresholdName: 'control',
          thresholdVersion: 2,
          value: 'control',
        },
        {
          scope: { type: 'threshold' as const, value: 0 },
          thresholdName: 'treatment',
          thresholdVersion: 2,
          value: 'treatment',
        },
      ],
    },
  },
};
