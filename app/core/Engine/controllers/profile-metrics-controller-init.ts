import {
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
} from '@metamask/profile-metrics-controller';
import { analyticsControllerSelectors } from '@metamask/analytics-controller';
import { MessengerClientInitFunction } from '../types';
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
export const profileMetricsControllerInit: MessengerClientInitFunction<
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
  ProfileMetricsControllerInitMessenger
> = ({
  controllerMessenger,
  persistedState,
  analyticsId,
  getState,
  initMessenger,
}) => {
  const assertUserOptedIn = () => {
    const analyticsState = initMessenger.call('AnalyticsController:getState');
    const isEnabled =
      analyticsControllerSelectors.selectEnabled(analyticsState);
    return (
      isEnabled === true && getState().legalNotices.isPna25Acknowledged === true
    );
  };

  const controller = new ProfileMetricsController({
    messenger: controllerMessenger,
    state: persistedState.ProfileMetricsController,
    assertUserOptedIn,
    getMetaMetricsId: () => analyticsId,
    initialDelayDuration: 60_000, // 1 minute delay
  });

  return {
    controller,
  };
};
