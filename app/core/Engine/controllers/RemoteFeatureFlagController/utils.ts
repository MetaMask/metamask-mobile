import {
  RemoteFeatureFlagController,
  ClientConfigApiService,
  ClientType,
  DistributionType,
  EnvironmentType,
} from '@metamask/remote-feature-flag-controller';

import Logger from '../../../../util/Logger';

import { RemoteFeatureFlagInitParamTypes } from './types';

const getFeatureFlagAppEnvironment = () => {
  const env = process.env.METAMASK_ENVIRONMENT;
  switch (env) {
    case 'local': return EnvironmentType.Development;
    case 'pre-release': return EnvironmentType.ReleaseCandidate;
    case 'production': return EnvironmentType.Production;
    default: return EnvironmentType.Development;
  }
};

const getFeatureFlagAppDistribution = () => {
  const dist = process.env.METAMASK_BUILD_TYPE;
  switch (dist) {
    case 'main': return DistributionType.Main;
    case 'flask': return DistributionType.Flask;
    default: return DistributionType.Main;
  }
};

export const createRemoteFeatureFlagController = ({
  state,
  messenger,
  disabled,
  getMetaMetricsId,
}: RemoteFeatureFlagInitParamTypes) => {
  const overrideMode = process.env.OVERRIDE_FEATURE_FLAGS;
  const controllerState = overrideMode ? {} : state;

  console.log('override value', overrideMode);
  console.log('controllerState', controllerState);

  const remoteFeatureFlagController = new RemoteFeatureFlagController({
    messenger,
    state: controllerState,
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
  });

  //

  if (disabled) {
    Logger.log('Feature flag controller disabled');
  } else if (overrideMode) {
    Logger.log('Remote feature flags override activated');
  } else {
    remoteFeatureFlagController.updateRemoteFeatureFlags().then(() => {
      Logger.log('Feature flags updated');
    });
  }
  return remoteFeatureFlagController;
};
