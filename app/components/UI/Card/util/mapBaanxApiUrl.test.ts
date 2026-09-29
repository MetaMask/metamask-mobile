import AppConstants from '../../../../core/AppConstants';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from './mapBaanxApiUrl';

describe('getDefaultBaanxApiBaseUrlForMetaMaskEnv', () => {
  const originalBaanxUrl = process.env.BAANX_API_URL;

  afterEach(() => {
    if (originalBaanxUrl !== undefined) {
      process.env.BAANX_API_URL = originalBaanxUrl;
    } else {
      delete process.env.BAANX_API_URL;
    }
  });

  describe('when BAANX_API_URL is set (builds.yml path)', () => {
    it('returns BAANX_API_URL from environment when set', () => {
      process.env.BAANX_API_URL = 'https://test.api';
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('any-env')).toBe(
        'https://test.api',
      );
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
  });

  describe('when BAANX_API_URL is not set (fallback path)', () => {
    beforeEach(() => {
      delete process.env.BAANX_API_URL;
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
