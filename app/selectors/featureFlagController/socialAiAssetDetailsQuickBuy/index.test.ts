import {
  selectSocialAiAssetDetailsQuickBuyEnabled,
  SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY,
} from '.';
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

describe('selectSocialAiAssetDetailsQuickBuyEnabled', () => {
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

  it('exposes the client-config flag key for registry alignment', () => {
    expect(SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY).toBe(
      'socialAiAssetDetailsQuickBuy',
    );
  });

  it('returns true when enabled is true and minimum version passes', () => {
    const result = selectSocialAiAssetDetailsQuickBuyEnabled.resultFunc({
      [SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(true);
  });

  it('returns true for direct version-gated shape (no wrapper)', () => {
    const result = selectSocialAiAssetDetailsQuickBuyEnabled.resultFunc({
      [SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY]: {
        enabled: true,
        minimumVersion: '7.73',
      },
    });
    expect(result).toBe(true);
  });

  it('returns false when enabled is false', () => {
    const result = selectSocialAiAssetDetailsQuickBuyEnabled.resultFunc({
      [SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY]: {
        value: { enabled: false, minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when minimum version requirement fails', () => {
    mockHasMinimumRequiredVersion.mockReturnValue(false);
    const result = selectSocialAiAssetDetailsQuickBuyEnabled.resultFunc({
      [SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY]: {
        value: { enabled: true, minimumVersion: '99.0.0' },
      },
    });
    expect(result).toBe(false);
  });

  it('returns false when flag is missing', () => {
    expect(selectSocialAiAssetDetailsQuickBuyEnabled.resultFunc({})).toBe(
      false,
    );
  });

  it('returns false for malformed payload', () => {
    const result = selectSocialAiAssetDetailsQuickBuyEnabled.resultFunc({
      [SOCIAL_AI_ASSET_DETAILS_QUICK_BUY_FLAG_KEY]: {
        value: { variant: 'enabled', minimumVersion: '7.73' },
      },
    });
    expect(result).toBe(false);
  });
});
