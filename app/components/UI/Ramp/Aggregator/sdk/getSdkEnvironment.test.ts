import { Environment } from '@consensys/on-ramp-sdk';
import { getSdkEnvironment } from './getSdkEnvironment';

describe('getSdkEnvironment', () => {
  const originalProcessEnv = process.env;
  const originalGithubActions = process.env.GITHUB_ACTIONS;
  const originalRampsEnvironment = process.env.RAMPS_ENVIRONMENT;
  const originalE2e = process.env.E2E;

  beforeEach(() => {
    process.env.GITHUB_ACTIONS = 'false';
  });

  afterAll(() => {
    process.env = originalProcessEnv;
  });

  afterEach(() => {
    if (originalGithubActions !== undefined) {
      process.env.GITHUB_ACTIONS = originalGithubActions;
    } else {
      delete process.env.GITHUB_ACTIONS;
    }
    if (originalRampsEnvironment !== undefined) {
      process.env.RAMPS_ENVIRONMENT = originalRampsEnvironment;
    } else {
      delete process.env.RAMPS_ENVIRONMENT;
    }
    if (originalE2e !== undefined) {
      process.env.E2E = originalE2e;
    } else {
      delete process.env.E2E;
    }
  });

  describe('when GITHUB_ACTIONS (builds.yml path)', () => {
    beforeEach(() => {
      process.env.GITHUB_ACTIONS = 'true';
      delete process.env.E2E;
    });

    it('returns Production when RAMPS_ENVIRONMENT is production', () => {
      process.env.RAMPS_ENVIRONMENT = 'production';
      expect(getSdkEnvironment()).toBe(Environment.Production);
    });

    it('returns Staging when RAMPS_ENVIRONMENT is not set', () => {
      delete process.env.RAMPS_ENVIRONMENT;
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('returns Staging when RAMPS_ENVIRONMENT is not production', () => {
      process.env.RAMPS_ENVIRONMENT = 'staging';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('ignores METAMASK_ENVIRONMENT (uses RAMPS_ENVIRONMENT)', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      process.env.RAMPS_ENVIRONMENT = 'staging';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('uses METAMASK_ENVIRONMENT when E2E is true (E2E path)', () => {
      process.env.GITHUB_ACTIONS = 'true';
      process.env.E2E = 'true';
      process.env.RAMPS_ENVIRONMENT = 'staging';
      process.env.METAMASK_ENVIRONMENT = 'production';
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

    it('returns Staging environment for test', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('returns Staging environment for e2e', () => {
      process.env.METAMASK_ENVIRONMENT = 'e2e';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });
  });

  describe('Default behavior', () => {
    it('returns Staging environment when METAMASK_ENVIRONMENT is undefined', () => {
      delete process.env.METAMASK_ENVIRONMENT;
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('returns Staging environment for unrecognized environment', () => {
      process.env.METAMASK_ENVIRONMENT = 'unknown';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('returns Staging environment for empty string', () => {
      process.env.METAMASK_ENVIRONMENT = '';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('returns Staging environment for null value', () => {
      process.env.METAMASK_ENVIRONMENT = null as unknown as string;
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });
  });

  describe('Edge cases', () => {
    it('handles case sensitivity - uppercase production falls to default', () => {
      process.env.METAMASK_ENVIRONMENT = 'PRODUCTION';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('handles case sensitivity - mixed case beta falls to default', () => {
      process.env.METAMASK_ENVIRONMENT = 'Beta';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('handles whitespace padding', () => {
      process.env.METAMASK_ENVIRONMENT = ' production ';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('handles numeric strings', () => {
      process.env.METAMASK_ENVIRONMENT = '123';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
    });

    it('handles special characters', () => {
      process.env.METAMASK_ENVIRONMENT = 'prod-1.0';
      expect(getSdkEnvironment()).toBe(Environment.Staging);
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
      { env: 'test', expected: Environment.Staging },
      { env: 'e2e', expected: Environment.Staging },
    ];

    testCases.forEach(({ env, expected }) => {
      it(`correctly maps ${env} to ${expected}`, () => {
        process.env.METAMASK_ENVIRONMENT = env;
        expect(getSdkEnvironment()).toBe(expected);
      });
    });
  });
});
