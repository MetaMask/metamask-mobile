import {
  DEFAULT_FEATURE_FLAG_VALUES,
  DEFAULT_MOBILE_MINIMUM_VERSIONS,
  FeatureFlagNames,
  getDefaultFeatureFlags,
} from './featureFlags';

describe('getDefaultFeatureFlags', () => {
  it('returns the centralized default feature flag values', () => {
    expect(getDefaultFeatureFlags()).toStrictEqual(DEFAULT_FEATURE_FLAG_VALUES);
  });

  it('includes known boolean defaults such as assetsDefiPositionsEnabled', () => {
    expect(
      getDefaultFeatureFlags()[FeatureFlagNames.assetsDefiPositionsEnabled],
    ).toBe(true);
  });

  it('includes structured object defaults such as mobileMinimumVersions', () => {
    expect(
      getDefaultFeatureFlags()[FeatureFlagNames.mobileMinimumVersions],
    ).toStrictEqual(DEFAULT_MOBILE_MINIMUM_VERSIONS);
  });

  it('returns a fresh copy that does not mutate the source map', () => {
    const defaults = getDefaultFeatureFlags();
    defaults[FeatureFlagNames.assetsDefiPositionsEnabled] = false;

    expect(
      DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.assetsDefiPositionsEnabled],
    ).toBe(true);
    expect(
      getDefaultFeatureFlags()[FeatureFlagNames.assetsDefiPositionsEnabled],
    ).toBe(true);
  });

  it('ignores the reserved context argument (static defaults today)', () => {
    expect(getDefaultFeatureFlags({ id: 'abc-123' })).toStrictEqual(
      getDefaultFeatureFlags(),
    );
  });
});
