import type { Json } from '@metamask/utils';
import {
  ASSET_GLOBAL_WATCHLIST_FLAG_KEY,
  ASSET_UNIFIED_WATCHLIST_FLAG_KEY,
  selectTokenWatchlistEnabled,
  selectUnifiedWatchlistEnabled,
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
    expect(ASSET_GLOBAL_WATCHLIST_FLAG_KEY).toBe('assetsGlobalWatchlistV1');
  });

  it('exposes the unified watchlist flag key for registry alignment', () => {
    expect(ASSET_UNIFIED_WATCHLIST_FLAG_KEY).toBe('assetsUnifiedWatchlistV1');
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

  it('enables the unified watchlist for a valid enabled flag', () => {
    const result = selectUnifiedWatchlistEnabled.resultFunc({
      [ASSET_UNIFIED_WATCHLIST_FLAG_KEY]: {
        enabled: true,
        minimumVersion: '7.73',
      },
    });

    expect(result).toBe(true);
  });

  it('disables the unified watchlist when the flag is missing', () => {
    const result = selectUnifiedWatchlistEnabled.resultFunc({});

    expect(result).toBe(false);
  });

  it('disables the unified watchlist when the flag is disabled', () => {
    const result = selectUnifiedWatchlistEnabled.resultFunc({
      [ASSET_UNIFIED_WATCHLIST_FLAG_KEY]: {
        enabled: false,
        minimumVersion: '7.73',
      },
    });

    expect(result).toBe(false);
  });
});
