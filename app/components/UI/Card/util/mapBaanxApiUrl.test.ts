import AppConstants from '../../../../core/AppConstants';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from './mapBaanxApiUrl';

describe('getDefaultBaanxApiBaseUrlForMetaMaskEnv', () => {
  const originalBaanxUrl = process.env.BAANX_API_URL;
  const originalGitHubActions = process.env.GITHUB_ACTIONS;
  const originalE2e = process.env.E2E;

  afterEach(() => {
    if (originalBaanxUrl !== undefined) {
      process.env.BAANX_API_URL = originalBaanxUrl;
    } else {
      delete process.env.BAANX_API_URL;
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

    it('returns BAANX_API_URL from environment when set', () => {
      process.env.BAANX_API_URL = 'https://test.api';
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('any-env')).toBe(
        'https://test.api',
      );
    });

    it('returns default fallback URL when BAANX_API_URL is not set', () => {
      delete process.env.BAANX_API_URL;
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('any-env');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('ignores metaMaskEnv parameter (URL is set at build time)', () => {
      process.env.BAANX_API_URL = 'https://custom.api';
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('dev')).toBe(
        'https://custom.api',
      );
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('production')).toBe(
        'https://custom.api',
      );
    });

    it('produces same output for same input', () => {
      process.env.BAANX_API_URL = 'https://test.api';
      const result1 = getDefaultBaanxApiBaseUrlForMetaMaskEnv('production');
      const result2 = getDefaultBaanxApiBaseUrlForMetaMaskEnv('production');
      expect(result1).toBe(result2);
    });

    it('uses metaMaskEnv when E2E is true (E2E path)', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.E2E = 'true';
      process.env.BAANX_API_URL = 'https://build-time.api';
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('production')).toBe(
        AppConstants.BAANX_API_URL.PRD,
      );
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('dev')).toBe(
        AppConstants.BAANX_API_URL.DEV,
      );
    });
  });

  describe('when not GITHUB_ACTIONS (Bitrise / .js.env path)', () => {
    beforeEach(() => {
      delete process.env.GITHUB_ACTIONS;
    });

    it('returns AppConstants.BAANX_API_URL.PRD for production/rc', () => {
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('production')).toBe(
        AppConstants.BAANX_API_URL.PRD,
      );
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('rc')).toBe(
        AppConstants.BAANX_API_URL.PRD,
      );
    });

    it('returns AppConstants.BAANX_API_URL.UAT for pre-release/exp/beta', () => {
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('pre-release')).toBe(
        AppConstants.BAANX_API_URL.UAT,
      );
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('exp')).toBe(
        AppConstants.BAANX_API_URL.UAT,
      );
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('beta')).toBe(
        AppConstants.BAANX_API_URL.UAT,
      );
    });

    it('returns AppConstants.BAANX_API_URL.DEV for dev/e2e/local', () => {
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('dev')).toBe(
        AppConstants.BAANX_API_URL.DEV,
      );
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('e2e')).toBe(
        AppConstants.BAANX_API_URL.DEV,
      );
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('local')).toBe(
        AppConstants.BAANX_API_URL.DEV,
      );
    });

    it('returns a non-empty string for all inputs', () => {
      const testCases = ['production', 'dev', undefined, null, '', 'unknown'];
      testCases.forEach((testCase) => {
        const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv(
          testCase as string | undefined,
        );
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
