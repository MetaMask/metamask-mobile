import {
  selectChartSocialMarkersEnabled,
  selectIsChartSocialMarkersAvailable,
} from '.';
import { FeatureFlagNames } from '../../../constants/featureFlags';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.73.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

const FLAG = FeatureFlagNames.tokenDetailsChartSocialMarkers;

describe('selectChartSocialMarkersEnabled', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    mockHasMinimumRequiredVersion = jest
      .spyOn(remoteFeatureFlagModule, 'hasMinimumRequiredVersion')
      .mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion.mockRestore();
  });

  it.each([true, false])(
    'follows the remote flag when enabled is %s',
    (enabled) => {
      expect(
        selectChartSocialMarkersEnabled.resultFunc({
          [FLAG]: { enabled, minimumVersion: '7.73.0' },
        }),
      ).toBe(enabled);
    },
  );

  it('unwraps a progressive rollout value', () => {
    expect(
      selectChartSocialMarkersEnabled.resultFunc({
        [FLAG]: {
          name: 'rollout',
          value: { enabled: true, minimumVersion: '7.73.0' },
        },
      }),
    ).toBe(true);
  });

  it('returns false when the minimum version is not met', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    expect(
      selectChartSocialMarkersEnabled.resultFunc({
        [FLAG]: { enabled: true, minimumVersion: '99.0.0' },
      }),
    ).toBe(false);
  });

  // `MM_TOKEN_DETAILS_CHART_SOCIAL_MARKERS` is inlined by Babel at transform
  // time (unset in tests), so the local fallback resolves to off here.
  it.each([
    ['missing', {}],
    ['invalid', { [FLAG]: { enabled: true } }],
  ])(
    'falls back to the local default (off) when the flag is %s',
    (_case, flags) => {
      expect(selectChartSocialMarkersEnabled.resultFunc(flags)).toBe(false);
    },
  );
});

describe('selectIsChartSocialMarkersAvailable', () => {
  it.each([
    [true, true, false, true],
    [true, false, true, true],
    [true, false, false, false],
    [false, true, true, false],
  ])(
    'markers=%s socialV1=%s leaderboard=%s -> %s',
    (markers, socialV1, leaderboard, expected) => {
      expect(
        selectIsChartSocialMarkersAvailable.resultFunc(
          markers,
          socialV1,
          leaderboard,
        ),
      ).toBe(expected);
    },
  );
});
