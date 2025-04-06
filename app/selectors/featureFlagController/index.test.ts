import mockedEngine from '../../core/__mocks__/MockedEngine';
import { selectProductSafetyDappScanningEnabled, selectRemoteFeatureFlagControllerState } from '.';
import { mockedEmptyFlagsState, mockedState, mockedUndefinedFlagsState } from './mocks';

jest.mock('../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('featureFlagController selector', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns feature flag remote values', () => {
    const result = selectRemoteFeatureFlagControllerState(mockedState);
    expect(result?.remoteFeatureFlags).toBeDefined();
  });

  it('returns feature flag empty state', () => {
    const result = selectRemoteFeatureFlagControllerState(mockedEmptyFlagsState);
    expect(result?.remoteFeatureFlags).toBeDefined();
  });

  it('returns feature flag undefined state', () => {
    const result = selectRemoteFeatureFlagControllerState(mockedUndefinedFlagsState);
    expect(result).toBeUndefined();
  });
});


describe('selectProductSafetyDappScanningEnabled', () => {
  it('returns true if product safety dapp scanning is enabled', () => {
    const result = selectProductSafetyDappScanningEnabled(mockedState);
    expect(result).toBe(true);
  });
});
