import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { selectDefiControllerV2Enabled } from '.';

describe('selectDefiControllerV2Enabled', () => {
  it('returns true when enabled is true', () => {
    expect(
      selectDefiControllerV2Enabled.resultFunc({
        [FeatureFlagNames.defiControllerV2]: { enabled: true },
      }),
    ).toBe(true);
  });

  it('returns false when enabled is false', () => {
    expect(
      selectDefiControllerV2Enabled.resultFunc({
        [FeatureFlagNames.defiControllerV2]: { enabled: false },
      }),
    ).toBe(false);
  });

  it('returns default when remote flag is not set', () => {
    expect(selectDefiControllerV2Enabled.resultFunc({})).toBe(
      Boolean(
        (
          DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.defiControllerV2] as {
            enabled?: boolean;
          }
        )?.enabled,
      ),
    );
  });

  it('returns false when flag has invalid shape', () => {
    expect(
      selectDefiControllerV2Enabled.resultFunc({
        [FeatureFlagNames.defiControllerV2]: { invalid: 'structure' },
      }),
    ).toBe(false);
  });
});
