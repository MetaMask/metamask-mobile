import {
  ProfileMetricsService,
  ProfileMetricsServiceMessenger,
} from '@metamask/profile-metrics-controller';
import { MessengerClientInitFunction } from '../types';
import { authEnv } from '../../devApiEnv';

/**
 * Initialize the profile metrics service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized controller.
 */
export const profileMetricsServiceInit: MessengerClientInitFunction<
  ProfileMetricsService,
  ProfileMetricsServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new ProfileMetricsService({
    messenger: controllerMessenger,
    fetch: fetch.bind(globalThis),
    env: authEnv(),
  });

  return {
    controller,
  };
};
