import { ControllerInitFunction } from '../../types';
import {
  AnalyticsController,
  AnalyticsControllerMessenger,
  AnalyticsControllerState,
  getDefaultAnalyticsControllerState,
} from '@metamask/analytics-controller';
import { createPlatformAdapter } from './platform-adapter';

/**
 * Initialize the analytics controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.metaMetricsId - The MetaMetrics ID to use as the analytics ID.
 * @returns The initialized controller.
 */
export const analyticsControllerInit: ControllerInitFunction<
  AnalyticsController,
  AnalyticsControllerMessenger
> = ({ controllerMessenger, metaMetricsId }) => {
  const defaultState = getDefaultAnalyticsControllerState();
  const state: AnalyticsControllerState = {
    ...defaultState,
    analyticsId: metaMetricsId,
  };

  const platformAdapter = createPlatformAdapter();

  const controller = new AnalyticsController({
    messenger: controllerMessenger,
    state,
    platformAdapter,
  });

  return {
    controller,
  };
};
