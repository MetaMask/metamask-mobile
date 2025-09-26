import {
  RemoteFeatureFlagController,
  ClientConfigApiService,
  ClientType,
  DistributionType,
  EnvironmentType,
} from '@metamask/remote-feature-flag-controller';

import Logger from '../../../../util/Logger';

import { RemoteFeatureFlagInitParamTypes } from './types';
import AppConstants from '../../../AppConstants';

// Points to the LaunchDarkly environment based on the METAMASK_ENVIRONMENT environment variable
export const getFeatureFlagAppEnvironment = () => {
  // Spread process.env, which forces a fresh read when running unit tests
  const env = { ...process.env }?.METAMASK_ENVIRONMENT;

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
  // Spread process.env, which forces a fresh read when running unit tests
  const dist = { ...process.env }?.METAMASK_BUILD_TYPE;

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

export const createRemoteFeatureFlagController = ({
  state,
  messenger,
  disabled,
  getMetaMetricsId,
  fetchInterval = AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
}: RemoteFeatureFlagInitParamTypes) => {
  const remoteFeatureFlagController = new RemoteFeatureFlagController({
    messenger,
    state,
    disabled,
    getMetaMetricsId,
    clientConfigApiService: new ClientConfigApiService({
      fetch,
      config: {
        client: ClientType.Mobile,
        environment: getFeatureFlagAppEnvironment(),
        distribution: getFeatureFlagAppDistribution(),
      },
    }),
    fetchInterval,
  });

  if (disabled) {
    Logger.log('Feature flag controller disabled');
  } else if (isRemoteFeatureFlagOverrideActivated) {
    Logger.log('Remote feature flags override activated');
  } else {
    remoteFeatureFlagController
      .updateRemoteFeatureFlags()
      .then(() => {
        Logger.log('Feature flags updated');
      })
      .catch((error) => Logger.log(error));
  }
  return remoteFeatureFlagController;
};
