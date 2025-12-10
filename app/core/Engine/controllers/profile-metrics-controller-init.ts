import {
  ProfileMetricsController,
  ProfileMetricsControllerMessenger,
} from '@metamask/profile-metrics-controller';
import { ControllerInitFunction } from '../types';
import { MetaMetrics } from '../../Analytics';

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
  const assertUserOptedIn = () =>
    remoteFeatureFlagController.state.remoteFeatureFlags.extensionUxPna25 ===
      true &&
    MetaMetrics.getInstance().isEnabled() === true &&
    getState().legalNotices.isPna25Acknowledged === true;

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
