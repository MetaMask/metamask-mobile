import { SdkEnvironment } from '../types/legacyDeposit';
import { getSdkEnvironment } from './getSdkEnvironment';

describe('getSdkEnvironment', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;
  const originalApiEnv = process.env.MM_API_ENV;

  beforeEach(() => {
    delete process.env.MM_API_ENV;
  });

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
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
      expect(getSdkEnvironment()).toBe(SdkEnvironment.Staging);
    });

    it('returns Production when MM_API_ENV is prod', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      process.env.MM_API_ENV = 'prod';
      expect(getSdkEnvironment()).toBe(SdkEnvironment.Production);
    });
  });

  describe('Production Environment', () => {
    it('returns Production for production environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production for beta environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production for rc environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
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

    it('returns Staging for exp environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Staging);
    });

    it('returns Production for test environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production for e2e environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });
  });

  describe('Default/Unknown Environment', () => {
    it('returns Production for undefined environment', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production for unknown environment value', () => {
      process.env.METAMASK_ENVIRONMENT = 'unknown-env';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production for empty string environment', () => {
      process.env.METAMASK_ENVIRONMENT = '';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });
  });

  describe('Edge Cases', () => {
    it('treats PRODUCTION as prod', () => {
      process.env.METAMASK_ENVIRONMENT = 'PRODUCTION';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });

    it('returns Production when the flavor value has whitespace', () => {
      process.env.METAMASK_ENVIRONMENT = ' production ';
      const result = getSdkEnvironment();
      expect(result).toBe(SdkEnvironment.Production);
    });
  });
});
