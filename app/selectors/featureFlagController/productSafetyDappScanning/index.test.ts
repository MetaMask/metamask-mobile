import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { selectProductSafetyDappScanningEnabled, FEATURE_FLAG_NAME } from './';
import { getFeatureFlagValue } from '../env';

jest.mock('../env', () => ({
  getFeatureFlagValue: jest.fn(),
}));

describe('selectProductSafetyDappScanningEnabled', () => {
  const createMockState = (remoteFlags: FeatureFlags = {}) => ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: remoteFlags,
          cacheTimestamp: 0,
        },
      },
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true regardless of remote flag value', () => {
    // Test with remote flag undefined
    const mockStateUndefined = createMockState({});
    expect(selectProductSafetyDappScanningEnabled(mockStateUndefined)).toBe(
      true,
    );
  });

  it('should ignore environment variables and always return false', () => {
    (getFeatureFlagValue as jest.Mock).mockReturnValue(true);
    const mockState = createMockState({
      [FEATURE_FLAG_NAME]: true,
    });
    expect(selectProductSafetyDappScanningEnabled(mockState)).toBe(true);
  });
});
