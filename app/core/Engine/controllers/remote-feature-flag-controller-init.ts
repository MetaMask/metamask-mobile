import { ControllerInitFunction } from '../types';
import {
  ClientConfigApiService,
  ClientType,
  RemoteFeatureFlagController,
  type RemoteFeatureFlagControllerMessenger,
} from '@metamask/remote-feature-flag-controller';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
  isRemoteFeatureFlagOverrideActivated,
} from './remote-feature-flag-controller';

/**
 * Initialize the remote feature flag controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const remoteFeatureFlagControllerInit: ControllerInitFunction<
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerMessenger
> = ({ controllerMessenger, persistedState, getState, metaMetricsId }) => {
  const disabled = !selectBasicFunctionalityEnabled(getState());

  const controller = new RemoteFeatureFlagController({
    messenger: controllerMessenger,
    state: persistedState.RemoteFeatureFlagController,
    disabled,
    getMetaMetricsId: () => metaMetricsId,
    clientConfigApiService: new ClientConfigApiService({
      fetch,
      config: {
        client: ClientType.Mobile,
        environment: getFeatureFlagAppEnvironment(),
        distribution: getFeatureFlagAppDistribution(),
      },
    }),
    fetchInterval: __DEV__
      ? 1000
      : AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
  });

  if (disabled) {
    Logger.log('Feature flag controller disabled.');
  } else if (isRemoteFeatureFlagOverrideActivated) {
    Logger.log('Remote feature flags override activated.');
  } else {
    controller
      .updateRemoteFeatureFlags()
      .then(() => {
        Logger.log('Feature flags updated');
      })
      .catch((error) => Logger.log('Feature flags update failed: ', error));
  }

  return {
    controller,
  };
};
