import { selectOwnedTokensImportEnabled } from '.';
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

const originalEnv = process.env;

describe('selectOwnedTokensImportEnabled', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
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
    process.env = originalEnv;
    mockHasMinimumRequiredVersion.mockRestore();
  });

  it('returns true when the flag is enabled and the app meets the minimum version', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              ownedTokensImportEnabled: {
                enabled: true,
                minimumVersion: '1.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectOwnedTokensImportEnabled(state);

    expect(result).toBe(true);
  });

  it('returns false when the minimum version check fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              ownedTokensImportEnabled: {
                enabled: true,
                minimumVersion: '99.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectOwnedTokensImportEnabled(state);

    expect(result).toBe(false);
  });

  it('returns false when the flag is disabled', () => {
    const state = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              ownedTokensImportEnabled: {
                enabled: false,
                minimumVersion: '0.0.0',
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectOwnedTokensImportEnabled(state);

    expect(result).toBe(false);
    expect(mockHasMinimumRequiredVersion).not.toHaveBeenCalled();
  });

  it('returns false when the flag is missing', () => {
    const result = selectOwnedTokensImportEnabled(mockedEmptyFlagsState);

    expect(result).toBe(false);
  });

  it('returns false when remote feature flag state is undefined', () => {
    const result = selectOwnedTokensImportEnabled(mockedUndefinedFlagsState);

    expect(result).toBe(false);
  });
});
