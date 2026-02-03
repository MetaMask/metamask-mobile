import { getDefaultRewardsApiBaseUrlForMetaMaskEnv } from './rewards-api-url';

describe('getDefaultRewardsApiBaseUrlForMetaMaskEnv', () => {
  const originalEnv = process.env.REWARDS_API_URL;

  afterEach(() => {
    // Restore original env after each test
    if (originalEnv !== undefined) {
      process.env.REWARDS_API_URL = originalEnv;
    } else {
      delete process.env.REWARDS_API_URL;
    }
  });

  it('returns REWARDS_API_URL from environment when set', () => {
    process.env.REWARDS_API_URL = 'https://test.api';
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('any-env')).toBe(
      'https://test.api',
    );
  });

  it('returns default fallback URL when REWARDS_API_URL is not set', () => {
    delete process.env.REWARDS_API_URL;
    const result = getDefaultRewardsApiBaseUrlForMetaMaskEnv('any-env');

    // Verify it returns a non-empty string (the fallback)
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('ignores metaMaskEnv parameter (URL is set at build time)', () => {
    process.env.REWARDS_API_URL = 'https://custom.api';

    // All environments return the same URL (set at build time)
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev')).toBe(
      'https://custom.api',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('production')).toBe(
      'https://custom.api',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('rc')).toBe(
      'https://custom.api',
    );
    expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv(undefined)).toBe(
      'https://custom.api',
    );
  });
});
