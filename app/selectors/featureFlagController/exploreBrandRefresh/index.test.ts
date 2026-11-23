import { selectExploreBrandRefreshEnabled } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectExploreBrandRefreshEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('defaults to disabled when the flag is absent', () => {
    expect(selectExploreBrandRefreshEnabled.resultFunc({})).toBe(false);
  });

  it('returns true when enabled and the minimum version is met', () => {
    expect(
      selectExploreBrandRefreshEnabled.resultFunc({
        [FeatureFlagNames.exploreBrandRefresh]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(true);
  });

  it('returns false when the minimum version is not met', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    expect(
      selectExploreBrandRefreshEnabled.resultFunc({
        [FeatureFlagNames.exploreBrandRefresh]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      }),
    ).toBe(false);
  });

  it('returns false when the flag shape is invalid', () => {
    expect(
      selectExploreBrandRefreshEnabled.resultFunc({
        [FeatureFlagNames.exploreBrandRefresh]: true,
      }),
    ).toBe(false);
  });
});
