import {
  selectRouteRestorationEnabled,
  selectRouteRestorationSettings,
} from './index';
import type { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';
import { ROUTE_RESTORE_WINDOW_MS } from '../../../util/navigation/routeRestoration';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock('../../../util/remoteFeatureFlag', () => ({
  ...jest.requireActual('../../../util/remoteFeatureFlag'),
  hasMinimumRequiredVersion: jest.fn(),
}));

const settingsFrom = (remoteFeatureFlags: FeatureFlags) =>
  selectRouteRestorationSettings.resultFunc(remoteFeatureFlags);

describe('selectRouteRestorationEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('defaults to disabled when the flag is absent', () => {
    expect(selectRouteRestorationEnabled.resultFunc(settingsFrom({}))).toBe(
      false,
    );
  });

  it('honours a boolean override when true', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc(
        settingsFrom({
          [FeatureFlagNames.routeRestoration]: true,
        }),
      ),
    ).toBe(true);
  });

  it('honours a boolean override when false', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc(
        settingsFrom({
          [FeatureFlagNames.routeRestoration]: false,
        }),
      ),
    ).toBe(false);
  });

  it('returns the version-gated value when the flag is valid', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc(
        settingsFrom({
          [FeatureFlagNames.routeRestoration]: {
            enabled: true,
            minimumVersion: '1.0.0',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns false when the version-gated flag is disabled', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc(
        settingsFrom({
          [FeatureFlagNames.routeRestoration]: {
            enabled: false,
            minimumVersion: '0.0.0',
          },
        }),
      ),
    ).toBe(false);
  });

  it('returns false when the flag shape is not version-gated', () => {
    expect(
      selectRouteRestorationEnabled.resultFunc(
        settingsFrom({
          [FeatureFlagNames.routeRestoration]: { enabled: 'yes' },
        }),
      ),
    ).toBe(false);
  });
});

describe('selectRouteRestorationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(hasMinimumRequiredVersion).mockReturnValue(true);
  });

  it('defaults window and catalog when boolean true', () => {
    expect(
      selectRouteRestorationSettings.resultFunc({
        [FeatureFlagNames.routeRestoration]: true,
      }),
    ).toStrictEqual({
      enabled: true,
      restoreWindowMs: ROUTE_RESTORE_WINDOW_MS,
    });
  });

  it('ignores remote restoreWindowMs and allowedRouteIds', () => {
    expect(
      selectRouteRestorationSettings.resultFunc({
        [FeatureFlagNames.routeRestoration]: {
          enabled: true,
          minimumVersion: '1.0.0',
          restoreWindowMs: 60_000,
          allowedRouteIds: ['TrendingView', 'NotInCatalog'],
        },
      }),
    ).toStrictEqual({
      enabled: true,
      restoreWindowMs: ROUTE_RESTORE_WINDOW_MS,
    });
  });

  it('uses the client window when extras are omitted on an enabled object', () => {
    expect(
      selectRouteRestorationSettings.resultFunc({
        [FeatureFlagNames.routeRestoration]: {
          enabled: true,
          minimumVersion: '1.0.0',
        },
      }),
    ).toStrictEqual({
      enabled: true,
      restoreWindowMs: ROUTE_RESTORE_WINDOW_MS,
    });
  });

  it('does not enable when the version-gated flag is off', () => {
    expect(
      selectRouteRestorationSettings.resultFunc({
        [FeatureFlagNames.routeRestoration]: {
          enabled: false,
          minimumVersion: '0.0.0',
          restoreWindowMs: 1,
          allowedRouteIds: ['TrendingView'],
        },
      }),
    ).toStrictEqual({
      enabled: false,
      restoreWindowMs: ROUTE_RESTORE_WINDOW_MS,
    });
  });
});
