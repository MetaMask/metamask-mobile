import { selectRouteRestorationEnabled } from './index';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

describe('selectRouteRestorationEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('defaults to disabled when the flag is absent', () => {
    expect(selectRouteRestorationEnabled.resultFunc({})).toBe(false);
  });

  it('honours a boolean override when true', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc({
        [FeatureFlagNames.routeRestoration]: true,
      }),
    ).toBe(true);
  });

  it('honours a boolean override when false', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc({
        [FeatureFlagNames.routeRestoration]: false,
      }),
    ).toBe(false);
  });

  it('returns the version-gated value when the flag is valid', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc({
        [FeatureFlagNames.routeRestoration]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      }),
    ).toBe(true);
  });

  it('returns false when the version-gated flag is disabled', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc({
        [FeatureFlagNames.routeRestoration]: {
          enabled: false,
          minimumVersion: '0.0.0',
        },
      }),
    ).toBe(false);
  });

  it('returns false when the flag shape is not version-gated', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc({
        [FeatureFlagNames.routeRestoration]: { enabled: 'yes' },
      }),
    ).toBe(false);
  });
});
