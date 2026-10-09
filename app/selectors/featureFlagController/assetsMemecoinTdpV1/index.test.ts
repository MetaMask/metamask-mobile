import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { selectAssetsMemecoinTdpV1Enabled } from '.';

describe('selectAssetsMemecoinTdpV1Enabled', () => {
  it('returns true when enabled is true', () => {
    expect(
      selectAssetsMemecoinTdpV1Enabled.resultFunc({
        [FeatureFlagNames.assetsMemecoinTdpV1]: { enabled: true },
      }),
    ).toBe(true);
  });

  it('returns false when enabled is false', () => {
    expect(
      selectAssetsMemecoinTdpV1Enabled.resultFunc({
        [FeatureFlagNames.assetsMemecoinTdpV1]: { enabled: false },
      }),
    ).toBe(false);
  });

  it('returns default when remote flag is not set', () => {
    expect(selectAssetsMemecoinTdpV1Enabled.resultFunc({})).toBe(
      Boolean(
        (
          DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.assetsMemecoinTdpV1] as {
            enabled?: boolean;
          }
        )?.enabled,
      ),
    );
  });

  it('returns false when flag has invalid shape', () => {
    expect(
      selectAssetsMemecoinTdpV1Enabled.resultFunc({
        [FeatureFlagNames.assetsMemecoinTdpV1]: { invalid: 'structure' },
      }),
    ).toBe(false);
  });
});
