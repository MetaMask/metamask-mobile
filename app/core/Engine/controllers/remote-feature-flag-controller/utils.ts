import {
  DistributionType,
  EnvironmentType,
} from '@metamask/remote-feature-flag-controller';

// Points to the LaunchDarkly environment based on the METAMASK_ENVIRONMENT environment variable
export const getFeatureFlagAppEnvironment = () => {
  const env = process.env.METAMASK_ENVIRONMENT;

  switch (env) {
    case 'production':
      return EnvironmentType.Production;
    case 'beta':
      return EnvironmentType.Beta;
    // TODO: Remove pre-release case once verified that pre-release is no longer used
    case 'pre-release':
    case 'rc':
      return EnvironmentType.ReleaseCandidate;
    // TODO: Create LD environment for e2e and mirror test values
    case 'e2e':
    case 'test':
      return EnvironmentType.Test;
    case 'exp':
      return EnvironmentType.Exp;
    case 'dev':
      return EnvironmentType.Development;
    default:
      return EnvironmentType.Development;
  }
};

export const getFeatureFlagAppDistribution = () => {
  const dist = process.env.METAMASK_BUILD_TYPE;

  switch (dist) {
    case 'main':
      return DistributionType.Main;
    case 'flask':
      return DistributionType.Flask;
    default:
      return DistributionType.Main;
  }
};

export const isRemoteFeatureFlagOverrideActivated =
  process.env.OVERRIDE_REMOTE_FEATURE_FLAGS === 'true';
