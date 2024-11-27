import {
  DistributionType,
  EnvironmentType,
} from '@metamask/remote-feature-flag-controller';

export const getFeatureFlagAppEnvironment = () => {
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (env) {
    case 'local': return EnvironmentType.Development;
    case 'pre-release': return EnvironmentType.ReleaseCandidate;
    case 'production': return EnvironmentType.Production;
    default: return EnvironmentType.Development;
  }
};

export const getFeatureFlagAppDistribution = () => {
  const dist = process.env.METAMASK_BUILD_TYPE;
  switch (dist) {
    case 'main': return DistributionType.Main;
    case 'flask': return DistributionType.Flask;
    default: return DistributionType.Main;
  }
};

