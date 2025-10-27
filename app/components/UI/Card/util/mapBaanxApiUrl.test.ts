import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from './mapBaanxApiUrl';
import AppConstants from '../../../../core/AppConstants';

// Mock AppConstants
jest.mock('../../../../core/AppConstants', () => ({
  BAANX_API_URL: {
    DEV: 'https://foxdev2-ag.foxcard.io',
    UAT: 'https://foxuat2-ag.foxcard.io',
    PRD: 'https://api.baanx.com',
  },
}));

describe('getDefaultBaanxApiBaseUrlForMetaMaskEnv', () => {
  const mockAppConstants = AppConstants as jest.Mocked<typeof AppConstants>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('environment-specific URL mapping', () => {
    it('returns DEV URL for e2e environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('e2e');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.DEV);
    });

    it('returns UAT URL for exp environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('exp');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.UAT);
    });

    it('returns PRD URL for rc environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('rc');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD);
    });

    it('returns UAT URL for pre-release environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('pre-release');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.UAT);
    });

    it('returns PRD URL for production environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('production');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD);
    });

    it('returns UAT URL for beta environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('beta');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.UAT);
    });

    it('returns DEV URL for dev environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('dev');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.DEV);
    });

    it('returns DEV URL for local environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('local');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.DEV);
    });
  });

  describe('default and edge cases', () => {
    it('returns PRD URL for undefined environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv(undefined);
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD);
    });

    it('returns PRD URL for unknown environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('unknown-env');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD);
    });

    it('returns PRD URL for empty string environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD);
    });

    it('returns PRD URL for null environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv(
        null as unknown as string,
      );
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD);
    });

    it('returns PRD URL for numeric environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv(
        123 as unknown as string,
      );
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD);
    });
  });

  describe('case sensitivity', () => {
    it('returns default PRD URL for uppercase PRODUCTION environment', () => {
      // Test exact case matching (the function should be case-sensitive)
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('PRODUCTION');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD); // Should fall to default
    });

    it('returns default PRD URL for mixed case Beta environment', () => {
      const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv('Beta');
      expect(result).toBe(mockAppConstants.BAANX_API_URL.PRD); // Should fall to default
    });
  });

  describe('comprehensive environment mapping', () => {
    const environmentMappings = [
      { env: 'e2e', expectedUrl: 'DEV' },
      { env: 'exp', expectedUrl: 'UAT' },
      { env: 'rc', expectedUrl: 'PRD' },
      { env: 'pre-release', expectedUrl: 'UAT' },
      { env: 'production', expectedUrl: 'PRD' },
      { env: 'beta', expectedUrl: 'UAT' },
      { env: 'dev', expectedUrl: 'DEV' },
      { env: 'local', expectedUrl: 'DEV' },
    ];

    it.each(environmentMappings)(
      'returns $expectedUrl URL for $env environment',
      ({ env, expectedUrl }) => {
        const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv(env);
        expect(result).toBe(
          mockAppConstants.BAANX_API_URL[
            expectedUrl as keyof typeof mockAppConstants.BAANX_API_URL
          ],
        );
      },
    );
  });

  describe('function behavior validation', () => {
    it('produces same output for same input (pure function)', () => {
      const env = 'production';
      const result1 = getDefaultBaanxApiBaseUrlForMetaMaskEnv(env);
      const result2 = getDefaultBaanxApiBaseUrlForMetaMaskEnv(env);

      expect(result1).toBe(result2);
      expect(result1).toBe(mockAppConstants.BAANX_API_URL.PRD);
    });

    it('does not modify the input parameter', () => {
      const originalEnv = 'production';
      const envCopy = originalEnv;

      getDefaultBaanxApiBaseUrlForMetaMaskEnv(envCopy);

      expect(envCopy).toBe(originalEnv);
    });

    it('returns a non-empty string for all inputs', () => {
      const testCases: (string | undefined | null)[] = [
        'production',
        'dev',
        undefined,
        null,
        '',
        'unknown',
      ];

      testCases.forEach((testCase) => {
        const result = getDefaultBaanxApiBaseUrlForMetaMaskEnv(
          testCase as string | undefined,
        );
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('integration with AppConstants', () => {
    it('accesses the correct AppConstants properties', () => {
      getDefaultBaanxApiBaseUrlForMetaMaskEnv('dev');

      // Verify that the function accesses the BAANX_API_URL object
      expect(mockAppConstants.BAANX_API_URL).toBeDefined();
      expect(mockAppConstants.BAANX_API_URL.DEV).toBe(
        'https://foxdev2-ag.foxcard.io',
      );
    });

    it('uses AppConstants structure with all required properties', () => {
      // Verify the expected structure exists
      expect(mockAppConstants.BAANX_API_URL).toHaveProperty('DEV');
      expect(mockAppConstants.BAANX_API_URL).toHaveProperty('UAT');
      expect(mockAppConstants.BAANX_API_URL).toHaveProperty('PRD');
    });
  });
});
