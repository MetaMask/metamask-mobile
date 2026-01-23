import { getDefaultRewardsApiBaseUrlForMetaMaskEnv } from './rewards-api-url';

describe('getDefaultRewardsApiBaseUrlForMetaMaskEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns REWARDS_API_URL from environment when set', () => {
    process.env.REWARDS_API_URL = 'https://custom.rewards.api';

    // Re-import to pick up new env
    jest.isolateModules(() => {
      const {
        getDefaultRewardsApiBaseUrlForMetaMaskEnv: fn,
      } = require('./rewards-api-url');
      expect(fn('any-env')).toBe('https://custom.rewards.api');
    });
  });

  it('returns default UAT URL when REWARDS_API_URL is not set', () => {
    delete process.env.REWARDS_API_URL;

    jest.isolateModules(() => {
      const {
        getDefaultRewardsApiBaseUrlForMetaMaskEnv: fn,
      } = require('./rewards-api-url');
      expect(fn('any-env')).toBe('https://rewards.uat-api.cx.metamask.io');
    });
  });

  it('ignores metaMaskEnv parameter (URL is set at build time)', () => {
    process.env.REWARDS_API_URL = 'https://test.api';

    jest.isolateModules(() => {
      const {
        getDefaultRewardsApiBaseUrlForMetaMaskEnv: fn,
      } = require('./rewards-api-url');

      // All environments return the same URL (set at build time)
      expect(fn('dev')).toBe('https://test.api');
      expect(fn('production')).toBe('https://test.api');
      expect(fn('rc')).toBe('https://test.api');
      expect(fn(undefined)).toBe('https://test.api');
    });
  });
});
