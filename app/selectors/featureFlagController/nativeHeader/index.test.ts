import { selectNativeHeaderEnabled } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectNativeHeaderEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('defaults to enabled when the flag is absent', () => {
    expect(selectNativeHeaderEnabled.resultFunc({})).toBe(true);
  });

  it('honours a boolean override', () => {
    expect(
      selectNativeHeaderEnabled.resultFunc({
        [FeatureFlagNames.nativeHeaderEnabled]: false,
      }),
    ).toBe(false);
  });

  it('returns the version-gated value when the flag is valid', () => {
    expect(
      selectNativeHeaderEnabled.resultFunc({
        [FeatureFlagNames.nativeHeaderEnabled]: {
          enabled: false,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(false);
  });

  it('falls back to enabled when the flag shape is invalid', () => {
    expect(
      selectNativeHeaderEnabled.resultFunc({
        [FeatureFlagNames.nativeHeaderEnabled]: { enabled: 'yes' },
      }),
    ).toBe(true);
  });
});
