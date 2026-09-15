import AppConstants from '../../../../core/AppConstants';
import { getDefaultCardApiBaseUrlForMetaMaskEnv } from './mapCardApiUrl';

describe('getDefaultCardApiBaseUrlForMetaMaskEnv', () => {
  const originalCardApiUrl = process.env.CARD_API_URL;

  afterEach(() => {
    if (originalCardApiUrl !== undefined) {
      process.env.CARD_API_URL = originalCardApiUrl;
    } else {
      delete process.env.CARD_API_URL;
    }
  });

  describe('when CARD_API_URL is set (builds.yml path)', () => {
    it('returns CARD_API_URL from environment when set', () => {
      process.env.CARD_API_URL = 'https://test.api';

      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('any-env')).toBe(
        'https://test.api',
      );
    });

    it('ignores metaMaskEnv parameter when URL is set at build time', () => {
      process.env.CARD_API_URL = 'https://custom.api';

      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('dev')).toBe(
        'https://custom.api',
      );
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('production')).toBe(
        'https://custom.api',
      );
    });

    it('produces same output for same input', () => {
      process.env.CARD_API_URL = 'https://test.api';

      const result1 = getDefaultCardApiBaseUrlForMetaMaskEnv('production');
      const result2 = getDefaultCardApiBaseUrlForMetaMaskEnv('production');

      expect(result1).toBe(result2);
    });
  });

  describe('when CARD_API_URL is not set (fallback path)', () => {
    beforeEach(() => {
      delete process.env.CARD_API_URL;
    });

    it('returns AppConstants.CARD_API_URL.PRD for production/rc', () => {
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('production')).toBe(
        AppConstants.CARD_API_URL.PRD,
      );
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('rc')).toBe(
        AppConstants.CARD_API_URL.PRD,
      );
    });

    it('returns AppConstants.CARD_API_URL.UAT for pre-release/exp/beta', () => {
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('pre-release')).toBe(
        AppConstants.CARD_API_URL.UAT,
      );
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('exp')).toBe(
        AppConstants.CARD_API_URL.UAT,
      );
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('beta')).toBe(
        AppConstants.CARD_API_URL.UAT,
      );
    });

    it('returns AppConstants.CARD_API_URL.DEV for dev/e2e/local', () => {
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('dev')).toBe(
        AppConstants.CARD_API_URL.DEV,
      );
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('e2e')).toBe(
        AppConstants.CARD_API_URL.DEV,
      );
      expect(getDefaultCardApiBaseUrlForMetaMaskEnv('local')).toBe(
        AppConstants.CARD_API_URL.DEV,
      );
    });

    it('returns a non-empty string for all inputs', () => {
      const testCases = ['production', 'dev', undefined, null, '', 'unknown'];

      testCases.forEach((testCase) => {
        const result = getDefaultCardApiBaseUrlForMetaMaskEnv(
          testCase as string | undefined,
        );

        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
