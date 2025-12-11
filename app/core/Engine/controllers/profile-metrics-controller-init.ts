import {
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
} from '@metamask/profile-metrics-controller';
import { ControllerInitFunction } from '../types';

/**
 * Initialize the profile metrics controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to use for the
 * controller.
 * @param request.getController - A function to get other initialized controllers.
 * @returns The initialized controller.
 */
export const profileMetricsControllerInit: ControllerInitFunction<
  ProfileMetricsController,
  ProfileMetricsControllerMessenger
> = ({
  controllerMessenger,
  persistedState,
  getController,
  analyticsId,
  getState,
}) => {
  const remoteFeatureFlagController = getController(
    'RemoteFeatureFlagController',
  );
  const assertUserOptedIn = () => {
    try {
      const isEnabled = (
        controllerMessenger as unknown as {
          call: (action: string) => boolean;
        }
      ).call('AnalyticsController:isEnabled') as boolean;
      return (
        remoteFeatureFlagController.state.remoteFeatureFlags
          .extensionUxPna25 === true &&
        isEnabled === true &&
        getState().legalNotices.isPna25Acknowledged === true
      );
    } catch {
      // If messenger call fails, return false (conservative approach)
      return false;
    }
  };

  const controller = new ProfileMetricsController({
    messenger: controllerMessenger,
    state: persistedState.ProfileMetricsController,
    assertUserOptedIn,
    getMetaMetricsId: () => analyticsId,
  });

  return {
    controller,
  };
};
