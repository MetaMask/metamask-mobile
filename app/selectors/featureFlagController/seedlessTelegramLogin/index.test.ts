import {
  DEFAULT_SEEDLESS_TELEGRAM_LOGIN_ENABLED,
  selectSeedlessTelegramLoginEnabled,
} from '.';
import { FeatureFlagNames } from '../../../constants/featureFlags';

describe('Seedless Telegram login feature flag selector', () => {
  const originalEnv = process.env.MM_SEEDLESS_TELEGRAM_LOGIN_ENABLED;

  beforeEach(() => {
    delete process.env.MM_SEEDLESS_TELEGRAM_LOGIN_ENABLED;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.MM_SEEDLESS_TELEGRAM_LOGIN_ENABLED;
      return;
    }

    process.env.MM_SEEDLESS_TELEGRAM_LOGIN_ENABLED = originalEnv;
  });

  it('returns the default value when the remote flag is missing', () => {
    const result = selectSeedlessTelegramLoginEnabled.resultFunc({});

    expect(result).toBe(DEFAULT_SEEDLESS_TELEGRAM_LOGIN_ENABLED);
  });

  it('returns the remote flag value when present', () => {
    const result = selectSeedlessTelegramLoginEnabled.resultFunc({
      [FeatureFlagNames.seedlessTelegramLoginEnabled]: true,
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force enable', () => {
    process.env.MM_SEEDLESS_TELEGRAM_LOGIN_ENABLED = 'true';

    const result = selectSeedlessTelegramLoginEnabled.resultFunc({
      [FeatureFlagNames.seedlessTelegramLoginEnabled]: false,
    });

    expect(result).toBe(true);
  });

  it('allows the local env var to force disable', () => {
    process.env.MM_SEEDLESS_TELEGRAM_LOGIN_ENABLED = 'false';

    const result = selectSeedlessTelegramLoginEnabled.resultFunc({
      [FeatureFlagNames.seedlessTelegramLoginEnabled]: true,
    });

    expect(result).toBe(false);
  });
});
