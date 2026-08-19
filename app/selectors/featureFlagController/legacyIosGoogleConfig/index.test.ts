import {
  DEFAULT_LEGACY_IOS_GOOGLE_CONFIG_ENABLED,
  selectLegacyIosGoogleConfigEnabled,
} from '.';
import { FeatureFlagNames } from '../../../constants/featureFlags';

describe('Legacy iOS Google Config Feature Flag Selector', () => {
  const originalEnv = process.env.MM_LEGACY_IOS_GOOGLE_CONFIG_ENABLED;

  beforeEach(() => {
    delete process.env.MM_LEGACY_IOS_GOOGLE_CONFIG_ENABLED;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_LEGACY_IOS_GOOGLE_CONFIG_ENABLED;
      return;
    }

    process.env.MM_LEGACY_IOS_GOOGLE_CONFIG_ENABLED = originalEnv;
  });

  it('returns the default value when the remote flag is missing', () => {
    const result = selectLegacyIosGoogleConfigEnabled.resultFunc({});

    expect(result).toBe(DEFAULT_LEGACY_IOS_GOOGLE_CONFIG_ENABLED);
  });

  it('returns the remote flag value when present', () => {
    const result = selectLegacyIosGoogleConfigEnabled.resultFunc({
      [FeatureFlagNames.legacyIosGoogleConfigEnabled]: false,
    });

    expect(result).toBe(false);
  });

  it('allows the local env var to force enable the legacy config', () => {
    process.env.MM_LEGACY_IOS_GOOGLE_CONFIG_ENABLED = 'true';

    const result = selectLegacyIosGoogleConfigEnabled.resultFunc({
      [FeatureFlagNames.legacyIosGoogleConfigEnabled]: false,
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force disable the legacy config', () => {
    process.env.MM_LEGACY_IOS_GOOGLE_CONFIG_ENABLED = 'false';

    const result = selectLegacyIosGoogleConfigEnabled.resultFunc({
      [FeatureFlagNames.legacyIosGoogleConfigEnabled]: true,
    });

    expect(result).toBe(false);
  });
});
