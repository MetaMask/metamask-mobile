import { ControllerInitFunction } from '../../types';
import {
  AnalyticsController,
  AnalyticsControllerMessenger,
  AnalyticsControllerState,
  getDefaultAnalyticsControllerState,
} from '@metamask/analytics-controller';
import { createPlatformAdapter } from './platform-adapter';
import { createPlatformAdapter as createE2EPlatformAdapter } from './platform-adapter-e2e';
import { isE2E } from '../../../../util/test/utils';

/**
 * Initialize the analytics controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.analyticsId - The analytics ID to use.
 * @param request.persistedState - The persisted state for all controllers.
 * @returns The initialized controller.
 */
export const analyticsControllerInit: ControllerInitFunction<
  AnalyticsController,
  AnalyticsControllerMessenger
> = ({ controllerMessenger, analyticsId, persistedState }) => {
  // Get persisted state for AnalyticsController, or use defaults
  const persistedAnalyticsState = persistedState.AnalyticsController;
  const defaultState = getDefaultAnalyticsControllerState();

  const state: AnalyticsControllerState = {
    optedIn: persistedAnalyticsState?.optedIn ?? defaultState.optedIn,
    analyticsId,
  };

  const platformAdapter = isE2E
    ? createE2EPlatformAdapter()
    : createPlatformAdapter();

  const controller = new AnalyticsController({
    messenger: controllerMessenger,
    state,
    platformAdapter,
    isAnonymousEventsFeatureEnabled: true,
  });

  controller.init();

  return {
    controller,
  };
};
