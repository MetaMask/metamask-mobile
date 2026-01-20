import {
  ProfileMetricsService,
  ProfileMetricsServiceMessenger,
} from '@metamask/profile-metrics-controller';
import { ControllerInitFunction } from '../types';
import { SDK } from '@metamask/profile-sync-controller';

/**
 * Initialize the profile metrics service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized controller.
 */
export const profileMetricsServiceInit: ControllerInitFunction<
  ProfileMetricsService,
  ProfileMetricsServiceMessenger
> = ({ controllerMessenger }) => {
  // The environment must be the same used by AuthenticationController.
  const env = SDK.Env.PRD;

  const controller = new ProfileMetricsService({
    messenger: controllerMessenger,
    fetch: fetch.bind(globalThis),
    env,
  });

  return {
    controller,
  };
};
