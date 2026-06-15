import { selectPriceAlertsEnabled } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { getVersion } from 'react-native-device-info';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../util/remoteFeatureFlag';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
}));

jest.mock(
  '../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('Price Alerts Feature Flag Selector (version-gated)', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
    (getVersion as jest.MockedFunction<typeof getVersion>).mockReturnValue(
      '1.0.0',
    );
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  it('returns true when priceAlertsEnabled is enabled and minimum version requirement passes', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              priceAlertsEnabled: { enabled: true, minimumVersion: '1.0.0' },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectPriceAlertsEnabled(state)).toBe(true);
  });

  it('returns false when priceAlertsEnabled is enabled but minimum version requirement fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);

    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              priceAlertsEnabled: { enabled: true, minimumVersion: '99.0.0' },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectPriceAlertsEnabled(state)).toBe(false);
  });

  it('returns false when priceAlertsEnabled is disabled regardless of version', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              priceAlertsEnabled: { enabled: false, minimumVersion: '0.0.0' },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectPriceAlertsEnabled(state)).toBe(false);
    expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
  });

  it('returns false when priceAlertsEnabled flag is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {},
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectPriceAlertsEnabled(state)).toBe(false);
  });

  it('returns false when feature flag state is empty', () => {
    expect(selectPriceAlertsEnabled(mockedEmptyFlagsState)).toBe(false);
  });

  it('returns false when RemoteFeatureFlagController state is undefined', () => {
    expect(selectPriceAlertsEnabled(mockedUndefinedFlagsState)).toBe(false);
  });

  it('returns false when priceAlertsEnabled has wrong property types', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              priceAlertsEnabled: { enabled: 'true', minimumVersion: 100 },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectPriceAlertsEnabled(state)).toBe(false);
  });

  it('returns false when priceAlertsEnabled is null', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: { priceAlertsEnabled: null },
            cacheTimestamp: 0,
          },
        },
      },
    };

    expect(selectPriceAlertsEnabled(state)).toBe(false);
  });
});
