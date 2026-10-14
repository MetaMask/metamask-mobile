import { selectInterimHeaderNavBarEnabled } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectInterimHeaderNavBarEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('is forced on for this preview branch even when the flag is absent', () => {
    expect(selectInterimHeaderNavBarEnabled.resultFunc({})).toBe(true);
  });

  it('returns true when enabled and the minimum version is met', () => {
    expect(
      selectInterimHeaderNavBarEnabled.resultFunc({
        [FeatureFlagNames.homeInterimHeaderNavBar]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(true);
  });

  it('stays on for this preview branch when the minimum version is not met', () => {
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(false);

    expect(
      selectInterimHeaderNavBarEnabled.resultFunc({
        [FeatureFlagNames.homeInterimHeaderNavBar]: {
          enabled: true,
          minimumVersion: '99.0.0',
        },
      }),
    ).toBe(true);
  });

  it('stays on for this preview branch when the flag shape is invalid', () => {
    expect(
      selectInterimHeaderNavBarEnabled.resultFunc({
        [FeatureFlagNames.homeInterimHeaderNavBar]: true,
      }),
    ).toBe(true);
  });
});
