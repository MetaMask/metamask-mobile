import { FEATURE_FLAG_NAME } from '../selectors/featureFlags';

const mockEnabledPredictLDFlag = {
  [FEATURE_FLAG_NAME]: true,
};

export const mockedPredictFeatureFlagsEnabledState: Record<string, boolean> =
  mockEnabledPredictLDFlag;
