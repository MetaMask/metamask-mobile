import {
  DEFAULT_TELEGRAM_LOGIN_ENABLED,
  selectTelegramLoginEnabled,
  TELEGRAM_LOGIN_ENABLED_FLAG_NAME,
} from '.';
import { FeatureFlagNames } from '../../../constants/featureFlags';

describe('Telegram login feature flag selector', () => {
  it('exposes the LaunchDarkly flag key for registry alignment', () => {
    expect(TELEGRAM_LOGIN_ENABLED_FLAG_NAME).toBe('telegram_login_enabled');
    expect(FeatureFlagNames.telegramLoginEnabled).toBe(
      'telegram_login_enabled',
    );
  });

  const originalEnv = process.env.MM_TELEGRAM_LOGIN_ENABLED;

  beforeEach(() => {
    delete process.env.MM_TELEGRAM_LOGIN_ENABLED;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_TELEGRAM_LOGIN_ENABLED;
      return;
    }

    process.env.MM_TELEGRAM_LOGIN_ENABLED = originalEnv;
  });

  it('returns the default value when the remote flag is missing', () => {
    const result = selectTelegramLoginEnabled.resultFunc({});

    expect(result).toBe(DEFAULT_TELEGRAM_LOGIN_ENABLED);
  });

  it('returns the remote flag value when present', () => {
    const result = selectTelegramLoginEnabled.resultFunc({
      [FeatureFlagNames.telegramLoginEnabled]: true,
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force enable', () => {
    process.env.MM_TELEGRAM_LOGIN_ENABLED = 'true';

    const result = selectTelegramLoginEnabled.resultFunc({
      [FeatureFlagNames.telegramLoginEnabled]: false,
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force disable', () => {
    process.env.MM_TELEGRAM_LOGIN_ENABLED = 'false';

    const result = selectTelegramLoginEnabled.resultFunc({
      [FeatureFlagNames.telegramLoginEnabled]: true,
    });

    expect(result).toBe(false);
  });
});
