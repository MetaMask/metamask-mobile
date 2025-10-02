import { SdkEnvironment } from '@consensys/native-ramps-sdk';
import { getSdkEnvironment } from './getSdkEnvironment';

describe('getSdkEnvironment', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
  });

  describe('Production Environment', () => {
    it('returns Production for production environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production for rc environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production for beta environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production for exp environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });
  });

  describe('Staging Environment', () => {
    it('returns Staging for dev environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });

    it('returns Staging for test environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });

    it('returns Staging for e2e environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });
  });

  describe('Default/Unknown Environment', () => {
    it('returns Staging for undefined environment', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });

    it('returns Staging for unknown environment value', () => {
      process.env.METAMASK_ENVIRONMENT = 'unknown-env';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });

    it('returns Staging for empty string environment', () => {
      process.env.METAMASK_ENVIRONMENT = '';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });
  });

  describe('Edge Cases', () => {
    it('handles case sensitivity correctly', () => {
      process.env.METAMASK_ENVIRONMENT = 'PRODUCTION';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });

    it('handles whitespace in environment value', () => {
      process.env.METAMASK_ENVIRONMENT = ' production ';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });
  });

  describe('All known environment values', () => {
    const testCases = [
      { env: 'production', expected: SdkEnvironment.Production },
      { env: 'beta', expected: SdkEnvironment.Production },
      { env: 'rc', expected: SdkEnvironment.Production },
      { env: 'dev', expected: SdkEnvironment.Staging },
      { env: 'exp', expected: SdkEnvironment.Production },
      { env: 'test', expected: SdkEnvironment.Staging },
      { env: 'e2e', expected: SdkEnvironment.Staging },
    ];

    testCases.forEach(({ env, expected }) => {
      it(`correctly maps ${env} to ${expected}`, () => {
        process.env.METAMASK_ENVIRONMENT = env;
        expect(getSdkEnvironment()).toBe(expected);
      });
    });
  });
});
