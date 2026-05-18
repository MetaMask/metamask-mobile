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

  it('returns true when enabled is true and minimum version passes', () => {
    const result = selectTokenWatchlistEnabled.resultFunc({
      [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '7.73' },
      },
    });
    expect(result).toStrictEqual(true);
  });

  it('returns true for direct version-gated shape (no wrapper)', () => {
    const result = selectTokenWatchlistEnabled.resultFunc({
      [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
        enabled: true,
        minimumVersion: '7.73',
      },
    });
    expect(result).toStrictEqual(true);
  });

  it('returns false when enabled is false', () => {
    const result = selectTokenWatchlistEnabled.resultFunc({
      [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
        value: { enabled: false, minimumVersion: '7.73' },
      },
    });
    expect(result).toStrictEqual(false);
  });

  it('returns false when minimum version requirement fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectTokenWatchlistEnabled.resultFunc({
      [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '99.0.0' },
      },
    });
    expect(result).toStrictEqual(false);
  });

  it('returns false when flag is missing', () => {
    expect(selectTokenWatchlistEnabled.resultFunc({})).toStrictEqual(false);
  });

  it('returns false for malformed payload', () => {
    const result = selectTokenWatchlistEnabled.resultFunc({
      [ASSET_GLOBAL_WATCHLIST_FLAG_KEY]: {
        value: { variant: 'enabled', minimumVersion: '7.73' },
      },
    });
    expect(result).toStrictEqual(false);
  });
});
