import { shouldSkipAppReinstallFromEnv } from './reinstallLocalBuildFromPath';

describe('shouldSkipAppReinstallFromEnv', () => {
  const key = 'SKIP_APP_REINSTALL';
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env[key];
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  });

  it('returns false when the variable is unset', () => {
    delete process.env[key];

    expect(shouldSkipAppReinstallFromEnv()).toBe(false);
  });

  it('returns true for true, 1, and yes (case-insensitive)', () => {
    process.env[key] = 'true';
    expect(shouldSkipAppReinstallFromEnv()).toBe(true);

    process.env[key] = 'TRUE';
    expect(shouldSkipAppReinstallFromEnv()).toBe(true);

    process.env[key] = '1';
    expect(shouldSkipAppReinstallFromEnv()).toBe(true);

    process.env[key] = 'yes';
    expect(shouldSkipAppReinstallFromEnv()).toBe(true);
  });

  it('returns false for false, 0, no, and other values', () => {
    process.env[key] = 'false';
    expect(shouldSkipAppReinstallFromEnv()).toBe(false);

    process.env[key] = '0';
    expect(shouldSkipAppReinstallFromEnv()).toBe(false);

    process.env[key] = 'no';
    expect(shouldSkipAppReinstallFromEnv()).toBe(false);

    process.env[key] = 'maybe';
    expect(shouldSkipAppReinstallFromEnv()).toBe(false);
  });
});
