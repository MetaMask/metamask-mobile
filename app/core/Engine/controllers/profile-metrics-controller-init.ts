import {
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
} from '@metamask/profile-metrics-controller';
import { analyticsControllerSelectors } from '@metamask/analytics-controller';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import { selectIsBasicFunctionalityConsolidationEnabled } from '../../../selectors/featureFlagController/basicFunctionalityConsolidation';
import { MessengerClientInitFunction } from '../types';
import { ProfileMetricsControllerInitMessenger } from '../messengers/profile-metrics-controller-messenger';

/**
 * Initialize the profile metrics controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to use for the
 * controller.
 * @param request.getMessengerClient - A function to get other initialized controllers.
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
    const state = getState();
    const isAnalyticsEnabled =
      analyticsControllerSelectors.selectEnabled(analyticsState);
    const isBftcGateOn = selectIsBasicFunctionalityConsolidationEnabled(state);
    return (
      state.legalNotices.isPna25Acknowledged === true &&
      selectBasicFunctionalityEnabled(state) === true &&
      (isBftcGateOn || isAnalyticsEnabled === true)
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
