import { ControllerInitFunction } from '../../types';
import {
  AnalyticsController,
  type AnalyticsControllerMessenger,
  getDefaultAnalyticsControllerState,
} from '@metamask/analytics-controller';
import { createPlatformAdapter } from './platform-adapter';
import Logger from '../../../../util/Logger';

/**
 * Initialize the AnalyticsController.
 *
 * @param request - The request object.
 * @returns The AnalyticsController.
 */
export const analyticsControllerInit: ControllerInitFunction<
  AnalyticsController,
  AnalyticsControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  Logger.log('Initializing AnalyticsController');

  const platformAdapter = createPlatformAdapter();

  const controller = new AnalyticsController({
    messenger: controllerMessenger,
    state:
      persistedState?.AnalyticsController ??
      getDefaultAnalyticsControllerState(),
    platformAdapter,
  });

  return { controller };
};
