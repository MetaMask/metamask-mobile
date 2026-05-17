import { resolveBaanxConfig } from './baanx-config';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from '../../../../../components/UI/Card/util/mapBaanxApiUrl';

jest.mock('../../../../../components/UI/Card/util/mapBaanxApiUrl', () => ({
  getDefaultBaanxApiBaseUrlForMetaMaskEnv: jest.fn(
    () => 'https://mocked-base-url',
  ),
}));

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
    beforeEach(() => {
      (getDefaultBaanxApiBaseUrlForMetaMaskEnv as jest.Mock).mockClear();
    });

    it('uses BAANX_API_URL directly when set', () => {
      process.env.BAANX_API_URL = 'https://override-url';

      const config = resolveBaanxConfig();

      expect(config.baseUrl).toBe('https://override-url');
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv).not.toHaveBeenCalled();
    });

    it('delegates to getDefaultBaanxApiBaseUrlForMetaMaskEnv when BAANX_API_URL is not set', () => {
      delete process.env.BAANX_API_URL;
      process.env.METAMASK_ENVIRONMENT = 'dev';

      const config = resolveBaanxConfig();

      expect(config.baseUrl).toBe('https://mocked-base-url');
      expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv).toHaveBeenCalledWith(
        'dev',
      );
    });
  });
});
