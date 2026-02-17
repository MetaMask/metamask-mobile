import AppConstants from '../../../../AppConstants';
import { getDefaultRewardsApiBaseUrlForMetaMaskEnv } from './rewards-api-url';

describe('getDefaultRewardsApiBaseUrlForMetaMaskEnv', () => {
  const originalRewardsUrl = process.env.REWARDS_API_URL;
  const originalBitrise = process.env.BITRISE;
  const originalE2e = process.env.E2E;

  afterEach(() => {
    if (originalRewardsUrl !== undefined) {
      process.env.REWARDS_API_URL = originalRewardsUrl;
    } else {
      delete process.env.REWARDS_API_URL;
    }
    if (originalBitrise !== undefined) {
      process.env.BITRISE = originalBitrise;
    } else {
      delete process.env.BITRISE;
    }
    if (originalE2e !== undefined) {
      process.env.E2E = originalE2e;
    } else {
      delete process.env.E2E;
    }
  });

  describe('when not Bitrise and not E2E (builds.yml path: GitHub Actions / local)', () => {
    beforeEach(() => {
      delete process.env.BITRISE;
      delete process.env.E2E;
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
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('ignores metaMaskEnv parameter (URL is set at build time)', () => {
      process.env.REWARDS_API_URL = 'https://custom.api';
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev')).toBe(
        'https://custom.api',
      );
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('production')).toBe(
        'https://custom.api',
      );
    });
  });

  describe('when Bitrise or E2E (legacy path)', () => {
    beforeEach(() => {
      process.env.BITRISE = 'true';
    });

    it('returns AppConstants.REWARDS_API_URL.PRD for production-like envs', () => {
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('production')).toBe(
        AppConstants.REWARDS_API_URL.PRD,
      );
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('beta')).toBe(
        AppConstants.REWARDS_API_URL.PRD,
      );
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('rc')).toBe(
        AppConstants.REWARDS_API_URL.PRD,
      );
    });

    it('returns AppConstants.REWARDS_API_URL.UAT for dev/test envs', () => {
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev')).toBe(
        AppConstants.REWARDS_API_URL.UAT,
      );
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('e2e')).toBe(
        AppConstants.REWARDS_API_URL.UAT,
      );
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('exp')).toBe(
        AppConstants.REWARDS_API_URL.UAT,
      );
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv(undefined)).toBe(
        AppConstants.REWARDS_API_URL.UAT,
      );
    });
  });
});
