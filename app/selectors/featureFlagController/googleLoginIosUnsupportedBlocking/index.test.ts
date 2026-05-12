import {
  DEFAULT_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED,
  selectGoogleLoginIosUnsupportedBlockingEnabled,
} from '.';
import { FeatureFlagNames } from '../../../constants/featureFlags';

describe('Google login iOS unsupported blocking feature flag selector', () => {
  const originalEnv =
    process.env.MM_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED;

  beforeEach(() => {
    delete process.env.MM_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED;
      return;
    }

    process.env.MM_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED = originalEnv;
  });

  it('returns the default value when the remote flag is missing', () => {
    const result = selectGoogleLoginIosUnsupportedBlockingEnabled.resultFunc(
      {},
    );

    expect(result).toBe(DEFAULT_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED);
  });

  it('returns the remote flag value when present', () => {
    const result = selectGoogleLoginIosUnsupportedBlockingEnabled.resultFunc({
      [FeatureFlagNames.googleLoginIosUnsupportedBlockingEnabled]: true,
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force enable', () => {
    process.env.MM_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED = 'true';

    const result = selectGoogleLoginIosUnsupportedBlockingEnabled.resultFunc({
      [FeatureFlagNames.googleLoginIosUnsupportedBlockingEnabled]: false,
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force disable', () => {
    process.env.MM_GOOGLE_LOGIN_IOS_UNSUPPORTED_BLOCKING_ENABLED = 'false';

    const result = selectGoogleLoginIosUnsupportedBlockingEnabled.resultFunc({
      [FeatureFlagNames.googleLoginIosUnsupportedBlockingEnabled]: true,
    });

    expect(result).toBe(false);
  });
});
