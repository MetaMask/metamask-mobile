import {
  ADDITIONAL_DEFAULT_FEATURE_FLAG_VALUES,
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
  MOBILE_MINIMUM_VERSIONS_FLAG_NAME,
  getDefaultFeatureFlags,
} from './featureFlags';

describe('getDefaultFeatureFlags', () => {
  it('returns the centralized default feature flag values merged with the additional (non-enum) defaults', () => {
    expect(getDefaultFeatureFlags()).toStrictEqual({
      ...DEFAULT_FEATURE_FLAG_VALUES,
      ...ADDITIONAL_DEFAULT_FEATURE_FLAG_VALUES,
    });
  });

  it('includes known enum defaults such as assetsDefiPositionsEnabled', () => {
    expect(getDefaultFeatureFlags()[FeatureFlagNames.assetsDefiPositionsEnabled]).toBe(
      true,
    );
  });

  it('includes structured non-enum defaults such as mobileMinimumVersions', () => {
    expect(
      getDefaultFeatureFlags()[MOBILE_MINIMUM_VERSIONS_FLAG_NAME],
    ).toStrictEqual(
      ADDITIONAL_DEFAULT_FEATURE_FLAG_VALUES[MOBILE_MINIMUM_VERSIONS_FLAG_NAME],
    );
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
