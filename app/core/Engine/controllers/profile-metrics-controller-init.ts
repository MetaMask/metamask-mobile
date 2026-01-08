import {
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
} from '@metamask/profile-metrics-controller';
import { analyticsControllerSelectors } from '@metamask/analytics-controller';
import { ControllerInitFunction } from '../types';
import { ProfileMetricsControllerInitMessenger } from '../messengers/profile-metrics-controller-messenger';

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
  ProfileMetricsControllerMessenger,
  ProfileMetricsControllerInitMessenger
> = ({
  controllerMessenger,
  persistedState,
  getController,
  analyticsId,
  getState,
  initMessenger,
}) => {
  const remoteFeatureFlagController = getController(
    'RemoteFeatureFlagController',
  );
  const assertUserOptedIn = () => {
    try {
      const analyticsState = initMessenger.call('AnalyticsController:getState');
      const isEnabled =
        analyticsControllerSelectors.selectEnabled(analyticsState);
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
