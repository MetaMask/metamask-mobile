import {
  RemoteFeatureFlagController,
  ClientConfigApiService,
  ClientType,
} from '@metamask/remote-feature-flag-controller';
import { RemoteFeatureFlagInitParamTypes } from './types';
import {
  getFeatureFlagAppEnvironment,
  getFeatureFlagAppDistribution
} from './utils';


const init = ({
  initialState,
  controllerMessenger,
  fetchFunction,
  disabled,
}: RemoteFeatureFlagInitParamTypes) => {

  const remoteFeatureFlagController = new RemoteFeatureFlagController({
    messenger: controllerMessenger.getRestricted({
      name: 'RemoteFeatureFlagController',
      allowedActions: [],
      allowedEvents: [],
    }),
    state: {
      ...initialState.RemoteFeatureFlagController
    },
    disabled,
    clientConfigApiService: new ClientConfigApiService({
      fetch: fetchFunction,
      config: {
        client: ClientType.Mobile,
        environment: getFeatureFlagAppEnvironment(),
        distribution: getFeatureFlagAppDistribution(),
      },
    }),
  });

  remoteFeatureFlagController.getRemoteFeatureFlags();

  return remoteFeatureFlagController;
}

export default {
  init
}
