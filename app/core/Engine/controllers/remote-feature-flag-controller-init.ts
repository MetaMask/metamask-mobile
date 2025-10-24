import { ControllerInitFunction } from '../types';
import {
  ClientConfigApiService,
  ClientType,
  RemoteFeatureFlagController,
} from '@metamask/remote-feature-flag-controller';
import { RemoteFeatureFlagControllerMessenger } from '../messengers/remote-feature-flag-controller-messenger';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import AppConstants from '../../AppConstants';
import Logger from '../../../util/Logger';
import {
  getFeatureFlagAppDistribution,
  getFeatureFlagAppEnvironment,
  isRemoteFeatureFlagOverrideActivated,
} from './remote-feature-flag-controller';
import {
  showErrorToast,
  showSuccessToast,
} from '../../../util/toast/GlobalToast';

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
    getMetaMetricsId: () => metaMetricsId ?? '',
    clientConfigApiService: new ClientConfigApiService({
      fetch,
      config: {
        client: ClientType.Mobile,
        environment: getFeatureFlagAppEnvironment(),
        distribution: getFeatureFlagAppDistribution(),
      },
      retries: 3, //optional input parameter, default is 3 declared for customBackoffInterval explicitly
      customBackoffInterval: [120, 240, 480], //optional input parameter
    }),
    fetchInterval: AppConstants.FEATURE_FLAGS_API.DEFAULT_FETCH_INTERVAL,
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
        showSuccessToast('feature flags updated');
      })
      .catch((error) => {
        Logger.log('Feature flag update failed:', error);
        // Show user-friendly toast notification for feature flag failures
        showErrorToast('feature flags update failed', error.message);
      });
  }

  return {
    controller,
  };
};
