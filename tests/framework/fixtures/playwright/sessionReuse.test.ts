import { isAppiumSessionReuseEnabled } from './sessionReuse.ts';
import { ProviderName, type WebDriverConfig } from '../../types.ts';

describe('isAppiumSessionReuseEnabled', () => {
  // Bracket access — babel transform-inline-environment-variables must not
  // bake these reads/writes or afterEach cleanup becomes `delete undefined`.
  // eslint-disable-next-line dot-notation
  const envKey = 'APPIUM_SESSION_REUSE';
  // eslint-disable-next-line dot-notation
  const previous = process.env[envKey];

  afterEach(() => {
    if (previous === undefined) {
      // eslint-disable-next-line dot-notation
      delete process.env[envKey];
    } else {
      // eslint-disable-next-line dot-notation
      process.env[envKey] = previous;
    }
  });

  it('returns false for BrowserStack regardless of env', () => {
    // eslint-disable-next-line dot-notation
    process.env[envKey] = 'true';

    const result = isAppiumSessionReuseEnabled({
      device: { provider: ProviderName.BROWSERSTACK, name: 'Pixel' },
    } as Pick<WebDriverConfig, 'device'>);

    expect(result).toBe(false);
  });

  it('returns false when APPIUM_SESSION_REUSE is false', () => {
    // eslint-disable-next-line dot-notation
    process.env[envKey] = 'false';

    const result = isAppiumSessionReuseEnabled({
      device: { provider: ProviderName.EMULATOR, name: 'Pixel' },
    } as Pick<WebDriverConfig, 'device'>);

    expect(result).toBe(false);
  });

  it('returns true by default for emulator when env is unset', () => {
    // eslint-disable-next-line dot-notation
    delete process.env[envKey];

    const result = isAppiumSessionReuseEnabled({
      device: { provider: ProviderName.EMULATOR, name: 'Pixel' },
    } as Pick<WebDriverConfig, 'device'>);

    expect(result).toBe(true);
  });

  it('returns true when APPIUM_SESSION_REUSE is true', () => {
    // eslint-disable-next-line dot-notation
    process.env[envKey] = 'true';

    const result = isAppiumSessionReuseEnabled({
      device: { provider: ProviderName.SIMULATOR, name: 'iPhone' },
    } as Pick<WebDriverConfig, 'device'>);

    expect(result).toBe(true);
  });
});
