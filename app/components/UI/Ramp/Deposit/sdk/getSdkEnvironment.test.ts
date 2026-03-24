import { SdkEnvironment } from '@consensys/native-ramps-sdk';
import { getSdkEnvironment } from './getSdkEnvironment';

describe('getSdkEnvironment', () => {
  const originalEnv = process.env.METAMASK_ENVIRONMENT;
  const originalBuildsEnabled =
    process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
  const originalRampsEnvironment = process.env.RAMPS_ENVIRONMENT;

  beforeEach(() => {
    process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY = 'false';
  });

  afterEach(() => {
    process.env.METAMASK_ENVIRONMENT = originalEnv;
    if (originalBuildsEnabled !== undefined) {
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY =
        originalBuildsEnabled;
    } else {
      delete process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY;
    }
    if (originalRampsEnvironment !== undefined) {
      process.env.RAMPS_ENVIRONMENT = originalRampsEnvironment;
    } else {
      delete process.env.RAMPS_ENVIRONMENT;
    }
  });

  describe('when BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY (builds.yml path)', () => {
    beforeEach(() => {
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY = 'true';
    });

    it('returns Production when RAMPS_ENVIRONMENT is production', () => {
      process.env.RAMPS_ENVIRONMENT = 'production';
      expect(getSdkEnvironment()).toBe(SdkEnvironment.Production);
    });

    it('returns Staging when RAMPS_ENVIRONMENT is not set', () => {
      delete process.env.RAMPS_ENVIRONMENT;
      expect(getSdkEnvironment()).toBe(SdkEnvironment.Staging);
    });

    it('returns Staging when RAMPS_ENVIRONMENT is not production', () => {
      process.env.RAMPS_ENVIRONMENT = 'staging';
      expect(getSdkEnvironment()).toBe(SdkEnvironment.Staging);
    });

    it('ignores METAMASK_ENVIRONMENT (uses RAMPS_ENVIRONMENT)', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      process.env.RAMPS_ENVIRONMENT = 'staging';
      expect(getSdkEnvironment()).toBe(SdkEnvironment.Staging);
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
});
