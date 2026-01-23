import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from './mapBaanxApiUrl';

describe('getDefaultBaanxApiBaseUrlForMetaMaskEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns BAANX_API_URL from environment when set', () => {
    process.env.BAANX_API_URL = 'https://custom.baanx.api';

    jest.isolateModules(() => {
      const {
        getDefaultBaanxApiBaseUrlForMetaMaskEnv: fn,
      } = require('./mapBaanxApiUrl');
      expect(fn('any-env')).toBe('https://custom.baanx.api');
    });
  });

  it('returns default dev URL when BAANX_API_URL is not set', () => {
    delete process.env.BAANX_API_URL;

    jest.isolateModules(() => {
      const {
        getDefaultBaanxApiBaseUrlForMetaMaskEnv: fn,
      } = require('./mapBaanxApiUrl');
      expect(fn('any-env')).toBe('https://dev.api.baanx.com');
    });
  });

  it('ignores metaMaskEnv parameter (URL is set at build time)', () => {
    process.env.BAANX_API_URL = 'https://test.api';

    jest.isolateModules(() => {
      const {
        getDefaultBaanxApiBaseUrlForMetaMaskEnv: fn,
      } = require('./mapBaanxApiUrl');

      // All environments return the same URL (set at build time)
      expect(fn('dev')).toBe('https://test.api');
      expect(fn('production')).toBe('https://test.api');
      expect(fn('rc')).toBe('https://test.api');
      expect(fn(undefined)).toBe('https://test.api');
    });
  });

  describe('function behavior validation', () => {
    it('produces same output for same input (pure function)', () => {
      process.env.BAANX_API_URL = 'https://api.baanx.com';

      jest.isolateModules(() => {
        const {
          getDefaultBaanxApiBaseUrlForMetaMaskEnv: fn,
        } = require('./mapBaanxApiUrl');

        const result1 = fn('production');
        const result2 = fn('production');
        expect(result1).toBe(result2);
      });
    });

    it('returns a non-empty string for all inputs', () => {
      process.env.BAANX_API_URL = 'https://api.baanx.com';

      jest.isolateModules(() => {
        const {
          getDefaultBaanxApiBaseUrlForMetaMaskEnv: fn,
        } = require('./mapBaanxApiUrl');

        const testCases = ['production', 'dev', undefined, null, '', 'unknown'];
        testCases.forEach((testCase) => {
          const result = fn(testCase);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
