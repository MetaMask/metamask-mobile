import type { Json } from '@metamask/utils';
import {
  ASSET_GLOBAL_WATCHLIST_FLAG_KEY,
  selectTokenWatchlistEnabled,
} from './featureFlags';
// eslint-disable-next-line import-x/no-namespace
import * as remoteFeatureFlagModule from '../../../../util/remoteFeatureFlag';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('7.73.0'),
}));

jest.mock(
  '../../../../core/Engine/controllers/remote-feature-flag-controller',
  () => ({
    isRemoteFeatureFlagOverrideActivated: false,
  }),
);

describe('selectTokenWatchlistEnabled', () => {
  let mockHasMinimumRequiredVersion: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasMinimumRequiredVersion = jest.spyOn(
      remoteFeatureFlagModule,
      'hasMinimumRequiredVersion',
    );
    mockHasMinimumRequiredVersion.mockReturnValue(true);
  });

  afterEach(() => {
    mockHasMinimumRequiredVersion?.mockRestore();
  });

  it('exposes the LaunchDarkly flag key for registry alignment', () => {
    expect(ASSET_GLOBAL_WATCHLIST_FLAG_KEY).toBe('assets-global-watchlist-v1');
  });

  const testCases: {
    name: string;
    state: Record<string, Json>;
    hasMinimumVersion: boolean;
    expected: boolean;
  }[] = [
    {
      name: 'returns true when enabled is true and minimum version passes',
      state: {
        [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
          value: { enabled: true, minimumVersion: '7.73' },
        },
      },
      hasMinimumVersion: true,
      expected: true,
    },
    {
      name: 'returns true for direct version-gated shape (no wrapper)',
      state: {
        [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
          enabled: true,
          minimumVersion: '7.73',
        },
      },
      hasMinimumVersion: true,
      expected: true,
    },
    {
      name: 'returns false when enabled is false',
      state: {
        [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
          value: { enabled: false, minimumVersion: '7.73' },
        },
      },
      hasMinimumVersion: true,
      expected: false,
    },
    {
      name: 'returns false when minimum version requirement fails',
      state: {
        [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
          value: { enabled: true, minimumVersion: '99.0.0' },
        },
      },
      hasMinimumVersion: false,
      expected: false,
    },
    {
      name: 'returns false when flag is missing',
      state: {},
      hasMinimumVersion: true,
      expected: false,
    },
    {
      name: 'returns false for malformed payload',
      state: {
        [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
          value: { variant: 'enabled', minimumVersion: '7.73' },
        },
      },
      hasMinimumVersion: true,
      expected: false,
    },
  ];

  it.each(testCases)('$name', ({ state, hasMinimumVersion, expected }) => {
    mockHasMinimumRequiredVersion.mockReturnValue(hasMinimumVersion);
    expect(selectTokenWatchlistEnabled.resultFunc(state)).toStrictEqual(
      expected,
    );
  });
});
