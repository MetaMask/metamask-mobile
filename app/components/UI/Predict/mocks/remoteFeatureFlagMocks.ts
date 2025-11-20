import { VersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

const mockEnabledPredictLDFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
};

export const mockedPredictFeatureFlagsEnabledState: Record<
  string,
  VersionGatedFeatureFlag
> = {
  predictTradingEnabled: mockEnabledPredictLDFlag,
};
