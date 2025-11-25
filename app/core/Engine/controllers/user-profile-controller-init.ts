import {
  UserProfileController,
  UserProfileControllerMessenger,
} from '@metamask/user-profile-controller';
import { ControllerInitFunction } from '../types';
import { MetaMetrics } from '../../Analytics';

/**
 * Initialize the user profile controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to use for the
 * controller.
 * @param request.getController - A function to get other initialized controllers.
 * @returns The initialized controller.
 */
export const userProfileControllerInit: ControllerInitFunction<
  UserProfileController,
  UserProfileControllerMessenger
> = ({ controllerMessenger, persistedState, getController, metaMetricsId }) => {
  const remoteFeatureFlagController = getController(
    'RemoteFeatureFlagController',
  );
  const assertUserOptedIn = () =>
    remoteFeatureFlagController.state.remoteFeatureFlags.extensionUxPna25 ===
      true && MetaMetrics.getInstance().isEnabled() === true;

  const controller = new UserProfileController({
    messenger: controllerMessenger,
    state: persistedState.UserProfileController,
    assertUserOptedIn,
    getMetaMetricsId: async () => metaMetricsId,
  });

  return {
    controller,
  };
};
