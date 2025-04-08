import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { selectProductSafetyDappScanningEnabled } from './';
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
    // Reset the mocked function to use second parameter (remote flag value)
    (getFeatureFlagValue as jest.Mock).mockImplementation((_, remoteValue) => remoteValue);
  });

  it('should return true when remote flag is true', () => {
    const mockState = createMockState({
      productSafetyDappScanning: true,
    });
    expect(selectProductSafetyDappScanningEnabled(mockState)).toBe(true);
  });

  it('should return false when remote flag is false', () => {
    const mockState = createMockState({
      productSafetyDappScanning: false,
    });
    expect(selectProductSafetyDappScanningEnabled(mockState)).toBe(false);
  });

  it('should prioritize environment variable over remote flag when set to true', () => {
    // Mock the getFeatureFlagValue to return true regardless of remote flag
    (getFeatureFlagValue as jest.Mock).mockReturnValue(true);
    const mockState = createMockState({
      productSafetyDappScanning: false,
    });
    expect(selectProductSafetyDappScanningEnabled(mockState)).toBe(true);
  });

  it('should prioritize environment variable over remote flag when set to false', () => {
    // Mock the getFeatureFlagValue to return false regardless of remote flag
    (getFeatureFlagValue as jest.Mock).mockReturnValue(false);
    const mockState = createMockState({
      productSafetyDappScanning: true,
    });
    expect(selectProductSafetyDappScanningEnabled(mockState)).toBe(false);
  });
}); 