import { resolveBaanxConfig } from './baanx-config';
import AppConstants from '../../../../AppConstants';

describe('resolveBaanxConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('apiKey', () => {
    it('returns MM_CARD_BAANX_API_CLIENT_KEY when set', () => {
      process.env.MM_CARD_BAANX_API_CLIENT_KEY = 'my-key';

      expect(resolveBaanxConfig().apiKey).toBe('my-key');
    });

    it('returns empty string when env var is missing', () => {
      delete process.env.MM_CARD_BAANX_API_CLIENT_KEY;

      expect(resolveBaanxConfig().apiKey).toBe('');
    });
  });

  describe('baseUrl', () => {
    it('returns BAANX_API_URL when GH Actions build flag is set', () => {
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY = 'true';
      process.env.BAANX_API_URL = 'https://custom.api.url';

      expect(resolveBaanxConfig().baseUrl).toBe('https://custom.api.url');
    });

    it('returns DEV url for dev environment', () => {
      delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
      process.env.METAMASK_ENVIRONMENT = 'dev';

      expect(resolveBaanxConfig().baseUrl).toBe(AppConstants.BAANX_API_URL.DEV);
    });

    it('returns DEV url for e2e environment', () => {
      delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
      process.env.METAMASK_ENVIRONMENT = 'e2e';

      expect(resolveBaanxConfig().baseUrl).toBe(AppConstants.BAANX_API_URL.DEV);
    });

    it('returns UAT url for pre-release environment', () => {
      delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
      process.env.METAMASK_ENVIRONMENT = 'pre-release';

      expect(resolveBaanxConfig().baseUrl).toBe(AppConstants.BAANX_API_URL.UAT);
    });

    it('returns PRD url for production environment', () => {
      delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
      process.env.METAMASK_ENVIRONMENT = 'production';

      expect(resolveBaanxConfig().baseUrl).toBe(AppConstants.BAANX_API_URL.PRD);
    });

    it('returns PRD url as default fallback', () => {
      delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
      process.env.METAMASK_ENVIRONMENT = 'unknown-env';

      expect(resolveBaanxConfig().baseUrl).toBe(AppConstants.BAANX_API_URL.PRD);
    });
  });
});
