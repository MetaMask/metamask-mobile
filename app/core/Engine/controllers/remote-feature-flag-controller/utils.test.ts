import {
  EnvironmentType,
  DistributionType,
} from '@metamask/remote-feature-flag-controller';
import {
  getFeatureFlagAppEnvironment,
  getFeatureFlagAppDistribution,
} from './utils';

describe('RemoteFeatureFlagController utils', () => {
  describe('getFeatureFlagAppEnvironment', () => {
    const originalMetamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

    afterAll(() => {
      process.env.METAMASK_ENVIRONMENT = originalMetamaskEnvironment;
    });

    it('returns EnvironmentType.Production when METAMASK_ENVIRONMENT is production', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Production);
    });

    it('returns EnvironmentType.Beta when METAMASK_ENVIRONMENT is beta', () => {
      process.env.METAMASK_ENVIRONMENT = 'beta';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Beta);
    });

    // TODO: Remove this test case once pre-release env is removed
    it('returns EnvironmentType.ReleaseCandidate when METAMASK_ENVIRONMENT is pre-release', () => {
      process.env.METAMASK_ENVIRONMENT = 'pre-release';
      expect(getFeatureFlagAppEnvironment()).toBe(
        EnvironmentType.ReleaseCandidate,
      );
    });

    it('returns EnvironmentType.ReleaseCandidate when METAMASK_ENVIRONMENT is rc', () => {
      process.env.METAMASK_ENVIRONMENT = 'rc';
      expect(getFeatureFlagAppEnvironment()).toBe(
        EnvironmentType.ReleaseCandidate,
      );
    });

    it('returns EnvironmentType.Test when METAMASK_ENVIRONMENT is test', () => {
      process.env.METAMASK_ENVIRONMENT = 'test';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Test);
    });

    it('returns EnvironmentType.Exp when METAMASK_ENVIRONMENT is exp', () => {
      process.env.METAMASK_ENVIRONMENT = 'exp';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Exp);
    });

    it('returns EnvironmentType.Development when METAMASK_ENVIRONMENT is dev', () => {
      process.env.METAMASK_ENVIRONMENT = 'dev';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Development);
    });

    it('returns EnvironmentType.Development when METAMASK_ENVIRONMENT is not set', () => {
      process.env.METAMASK_ENVIRONMENT = '';
      expect(getFeatureFlagAppEnvironment()).toBe(EnvironmentType.Development);
    });
  });

  describe('getFeatureFlagAppDistribution', () => {
    const originalMetamaskBuildType = process.env.METAMASK_BUILD_TYPE;

    afterAll(() => {
      process.env.METAMASK_BUILD_TYPE = originalMetamaskBuildType;
    });

    it('returns DistributionType.Main when METAMASK_BUILD_TYPE is main', () => {
      process.env.METAMASK_BUILD_TYPE = 'main';
      expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Main);
    });

    it('returns DistributionType.Flask when METAMASK_BUILD_TYPE is flask', () => {
      process.env.METAMASK_BUILD_TYPE = 'flask';
      expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Flask);
    });

    it('returns DistributionType.Main when METAMASK_BUILD_TYPE is not set', () => {
      process.env.METAMASK_BUILD_TYPE = '';
      expect(getFeatureFlagAppDistribution()).toBe(DistributionType.Main);
    });
  });
});
