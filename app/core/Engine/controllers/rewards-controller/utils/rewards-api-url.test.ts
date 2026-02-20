import AppConstants from '../../../../AppConstants';
import { getDefaultRewardsApiBaseUrlForMetaMaskEnv } from './rewards-api-url';

describe('getDefaultRewardsApiBaseUrlForMetaMaskEnv', () => {
  const originalRewardsUrl = process.env.REWARDS_API_URL;
  const originalGitHubActions = process.env.GITHUB_ACTIONS;
  const originalE2e = process.env.E2E;

  afterEach(() => {
    if (originalRewardsUrl !== undefined) {
      process.env.REWARDS_API_URL = originalRewardsUrl;
    } else {
      delete process.env.REWARDS_API_URL;
    }
    if (originalGitHubActions !== undefined) {
      process.env.GITHUB_ACTIONS = originalGitHubActions;
    } else {
      delete process.env.GITHUB_ACTIONS;
    }
    if (originalE2e !== undefined) {
      process.env.E2E = originalE2e;
    } else {
      delete process.env.E2E;
    }
  });

  describe('when GITHUB_ACTIONS (builds.yml path)', () => {
    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
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

    it('uses metaMaskEnv when E2E is true (E2E path)', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.E2E = 'true';
      process.env.REWARDS_API_URL = 'https://build-time.api';
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('production')).toBe(
        AppConstants.REWARDS_API_URL.PRD,
      );
      expect(getDefaultRewardsApiBaseUrlForMetaMaskEnv('dev')).toBe(
        AppConstants.REWARDS_API_URL.UAT,
      );
    });
  });

  describe('when not GITHUB_ACTIONS (Bitrise / .js.env path)', () => {
    beforeEach(() => {
      delete process.env.GITHUB_ACTIONS;
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
