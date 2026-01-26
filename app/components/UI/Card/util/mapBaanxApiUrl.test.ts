import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from './mapBaanxApiUrl';

describe('getDefaultBaanxApiBaseUrlForMetaMaskEnv', () => {
  const originalEnv = process.env.BAANX_API_URL;

  afterEach(() => {
    // Restore original env after each test
    if (originalEnv !== undefined) {
      process.env.BAANX_API_URL = originalEnv;
    } else {
      delete process.env.BAANX_API_URL;
    }
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

    // Verify it returns a non-empty string (the fallback)
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('ignores metaMaskEnv parameter (URL is set at build time)', () => {
    process.env.BAANX_API_URL = 'https://custom.api';

    // All environments return the same URL (set at build time)
    expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('dev')).toBe(
      'https://custom.api',
    );
    expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('production')).toBe(
      'https://custom.api',
    );
    expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv('rc')).toBe(
      'https://custom.api',
    );
    expect(getDefaultBaanxApiBaseUrlForMetaMaskEnv(undefined)).toBe(
      'https://custom.api',
    );
  });

  describe('function behavior validation', () => {
    it('produces same output for same input (pure function)', () => {
      process.env.BAANX_API_URL = 'https://test.api';

      const result1 = getDefaultBaanxApiBaseUrlForMetaMaskEnv('production');
      const result2 = getDefaultBaanxApiBaseUrlForMetaMaskEnv('production');
      expect(result1).toBe(result2);
    });

    it('returns a non-empty string for all inputs', () => {
      process.env.BAANX_API_URL = 'https://test.api';

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
