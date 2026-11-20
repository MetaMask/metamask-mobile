import { selectCollectiblesEnabledFlag } from './featureFlags';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('8.23.0'),
}));

describe('selectCollectiblesEnabledFlag', () => {
  it('returns true when flag is enabled and version is met', () => {
    const state = {
      settings: { basicFunctionalityEnabled: true },
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              collectiblesEnabled: {
                enabled: true,
                minimumVersion: '8.0.0',
              },
            },
          },
        },
      },
    };

    expect(selectCollectiblesEnabledFlag(state)).toBe(true);
  });

  it('returns false when flag is disabled', () => {
    const state = {
      settings: { basicFunctionalityEnabled: true },
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              collectiblesEnabled: {
                enabled: false,
                minimumVersion: '8.0.0',
              },
            },
          },
        },
      },
    };

    expect(selectCollectiblesEnabledFlag(state)).toBe(false);
  });

  it('returns false when version requirement is not met', () => {
    const state = {
      settings: { basicFunctionalityEnabled: true },
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              collectiblesEnabled: {
                enabled: true,
                minimumVersion: '999.0.0',
              },
            },
          },
        },
      },
    };

    expect(selectCollectiblesEnabledFlag(state)).toBe(false);
  });

  it('returns false when flag is missing', () => {
    const state = {
      settings: { basicFunctionalityEnabled: true },
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {},
          },
        },
      },
    };

    expect(selectCollectiblesEnabledFlag(state)).toBe(false);
  });

  it('returns false when flag is invalid', () => {
    const state = {
      settings: { basicFunctionalityEnabled: true },
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              collectiblesEnabled: 'invalid',
            },
          },
        },
      },
    };

    expect(selectCollectiblesEnabledFlag(state)).toBe(false);
  });
});
