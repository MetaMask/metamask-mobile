import {
  getBackendApiUrlsOption,
  isBackendAuthDisabled,
} from './coreBackendApiUrls';

const ENV_VAR_NAMES = [
  'MM_BACKEND_ACCOUNTS_API_URL',
  'MM_BACKEND_PRICES_API_URL',
  'MM_BACKEND_TOKEN_API_URL',
  'MM_BACKEND_TOKENS_API_URL',
  'MM_BACKEND_DISABLE_AUTH',
] as const;

describe('coreBackendApiUrls', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    ENV_VAR_NAMES.forEach((name) => {
      delete process.env[name];
    });
  });

  afterEach(() => {
    for (const key of new Set([
      ...Object.keys(originalEnv),
      ...Object.keys(process.env),
    ])) {
      if (originalEnv[key]) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  describe('getBackendApiUrlsOption', () => {
    it('returns an empty object when no override env vars are set', () => {
      const result = getBackendApiUrlsOption();

      expect(result).toEqual({});
    });

    it('maps MM_BACKEND_ACCOUNTS_API_URL to the ACCOUNTS api url', () => {
      process.env.MM_BACKEND_ACCOUNTS_API_URL = 'https://dev.accounts.api';

      const result = getBackendApiUrlsOption();

      expect(result).toEqual({
        apiUrls: { ACCOUNTS: 'https://dev.accounts.api' },
      });
    });

    it('maps MM_BACKEND_PRICES_API_URL to the PRICES api url', () => {
      process.env.MM_BACKEND_PRICES_API_URL = 'https://dev.prices.api';

      const result = getBackendApiUrlsOption();

      expect(result).toEqual({
        apiUrls: { PRICES: 'https://dev.prices.api' },
      });
    });

    it('maps MM_BACKEND_TOKEN_API_URL to the TOKEN api url', () => {
      process.env.MM_BACKEND_TOKEN_API_URL = 'https://dev.token.api';

      const result = getBackendApiUrlsOption();

      expect(result).toEqual({
        apiUrls: { TOKEN: 'https://dev.token.api' },
      });
    });

    it('maps MM_BACKEND_TOKENS_API_URL to the TOKENS api url', () => {
      process.env.MM_BACKEND_TOKENS_API_URL = 'https://dev.tokens.api';

      const result = getBackendApiUrlsOption();

      expect(result).toEqual({
        apiUrls: { TOKENS: 'https://dev.tokens.api' },
      });
    });

    it('combines multiple override env vars into one apiUrls object', () => {
      process.env.MM_BACKEND_ACCOUNTS_API_URL = 'https://dev.accounts.api';
      process.env.MM_BACKEND_PRICES_API_URL = 'https://dev.prices.api';
      process.env.MM_BACKEND_TOKEN_API_URL = 'https://dev.token.api';
      process.env.MM_BACKEND_TOKENS_API_URL = 'https://dev.tokens.api';

      const result = getBackendApiUrlsOption();

      expect(result).toEqual({
        apiUrls: {
          ACCOUNTS: 'https://dev.accounts.api',
          PRICES: 'https://dev.prices.api',
          TOKEN: 'https://dev.token.api',
          TOKENS: 'https://dev.tokens.api',
        },
      });
    });

    it('ignores override env vars set to an empty string', () => {
      process.env.MM_BACKEND_ACCOUNTS_API_URL = '';
      process.env.MM_BACKEND_PRICES_API_URL = '';
      process.env.MM_BACKEND_TOKEN_API_URL = '';
      process.env.MM_BACKEND_TOKENS_API_URL = '';

      const result = getBackendApiUrlsOption();

      expect(result).toEqual({});
    });
  });

  describe('isBackendAuthDisabled', () => {
    it('returns true when MM_BACKEND_DISABLE_AUTH is "true"', () => {
      process.env.MM_BACKEND_DISABLE_AUTH = 'true';

      const result = isBackendAuthDisabled();

      expect(result).toBe(true);
    });

    it('returns false when MM_BACKEND_DISABLE_AUTH is unset', () => {
      const result = isBackendAuthDisabled();

      expect(result).toBe(false);
    });

    it('returns false when MM_BACKEND_DISABLE_AUTH is "false"', () => {
      process.env.MM_BACKEND_DISABLE_AUTH = 'false';

      const result = isBackendAuthDisabled();

      expect(result).toBe(false);
    });

    it('returns false when MM_BACKEND_DISABLE_AUTH is set to another value', () => {
      process.env.MM_BACKEND_DISABLE_AUTH = '1';

      const result = isBackendAuthDisabled();

      expect(result).toBe(false);
    });
  });
});
