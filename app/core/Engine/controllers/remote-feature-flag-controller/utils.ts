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

const getFeatureFlagAppEnvironment = () => {
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (env) {
    case 'pre-release':
    case 'rc':
      return EnvironmentType.ReleaseCandidate;
    case 'production':
    case 'beta':
      return EnvironmentType.Production;
    case 'local':
    case 'exp':
    default:
      return EnvironmentType.Development;
  }
};

const getFeatureFlagAppDistribution = () => {
  const dist = process.env.METAMASK_BUILD_TYPE;
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (dist) {
    case 'main':
      return env === 'beta' ? DistributionType.Beta : DistributionType.Main;
    case 'flask':
      return DistributionType.Flask;
    case 'beta':
      return DistributionType.Beta;
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
