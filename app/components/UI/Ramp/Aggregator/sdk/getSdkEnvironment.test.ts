import { Environment } from '@consensys/on-ramp-sdk';
import { getSdkEnvironment } from './getSdkEnvironment';

describe('getSdkEnvironment', () => {
  const originalProcessEnv = process.env;
  const originalApiEnv = process.env.MM_API_ENV;

  beforeEach(() => {
    delete process.env.MM_API_ENV;
  });

  afterAll(() => {
    process.env = originalProcessEnv;
  });

  afterEach(() => {
    if (originalApiEnv !== undefined) {
      process.env.MM_API_ENV = originalApiEnv;
    } else {
      delete process.env.MM_API_ENV;
    }
  });

  describe('when MM_API_ENV is set', () => {
    it('returns Staging when MM_API_ENV is dev', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      process.env.MM_API_ENV = 'dev';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('returns Production when MM_API_ENV is prod', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      process.env.MM_API_ENV = 'prod';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });
  });

  describe('Production environments', () => {
    it('returns Production environment for production', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production environment for beta', () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production environment for rc', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });
  });

  describe('Staging environments', () => {
    it('returns Staging environment for dev', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('returns Staging environment for exp', () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('returns Production environment for test', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production environment for e2e', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });
  });

  describe('Default behavior', () => {
    it('returns Production environment when METAMASK_ENVIRONMENT is undefined', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production environment for unrecognized environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'unknown';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production environment for empty string', () => {
      process.env.METAMASK_ENVIRONMENT = '';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production environment for null value', () => {
      process.env.METAMASK_ENVIRONMENT = null as unknown as string;
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });
  });

  describe('Edge cases', () => {
    it('treats uppercase PRODUCTION as prod', () => {
      process.env.METAMASK_ENVIRONMENT = 'PRODUCTION';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('treats mixed case Beta as prod', () => {
      process.env.METAMASK_ENVIRONMENT = 'Beta';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production when the flavor value has whitespace', () => {
      process.env.METAMASK_ENVIRONMENT = ' production ';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production for numeric strings', () => {
      process.env.METAMASK_ENVIRONMENT = '123';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Production for unrecognized special characters', () => {
      process.env.METAMASK_ENVIRONMENT = 'prod-1.0';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });
  });

  describe('Environment consistency', () => {
    it('returns the same result for the same input', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      const result1 = getSdkEnvironment();
      const result2 = getSdkEnvironment();
      expect(result1).toBe(result2);
      expect(result1).toBe(Environment.Production);
    });

    it('returns different environments for different inputs', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      const productionResult = getSdkEnvironment();

      process.env.METAMASK_ENVIRONMENT = 'dev';
      const devResult = getSdkEnvironment();

      expect(productionResult).not.toBe(devResult);
      expect(productionResult).toBe(Environment.Production);
      expect(devResult).toBe(Environment.Staging);
    });
  });

  describe('All known environment values', () => {
    const testCases = [
      { env: 'production', expected: Environment.Production },
      { env: 'beta', expected: Environment.Production },
      { env: 'rc', expected: Environment.Production },
      { env: 'dev', expected: Environment.Staging },
      { env: 'exp', expected: Environment.Staging },
      { env: 'test', expected: Environment.Production },
      { env: 'e2e', expected: Environment.Production },
    ];

    testCases.forEach(({ env, expected }) => {
      it(`correctly maps ${env} to ${expected}`, () => {
        process.env.METAMASK_ENVIRONMENT = env;
        expect(getSdkEnvironment()).toBe(expected);
      });
    });
  });
});
