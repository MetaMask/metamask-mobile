import { MessengerClientInitFunction } from '../../types';
import {
  AnalyticsController,
  AnalyticsControllerMessenger,
  AnalyticsControllerState,
  getDefaultAnalyticsControllerState,
} from '@metamask/analytics-controller';
import { createPlatformAdapter } from './platform-adapter';
import { createPlatformAdapter as createE2EPlatformAdapter } from './platform-adapter-e2e';
import { isE2E } from '../../../../util/test/utils';
import { getBrazePlugin, syncBrazeAllowlists } from '../../../Braze';
import type { AnalyticsControllerInitMessenger } from '../../messengers/analytics-controller-messenger';

/**
 * Initialize the analytics controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.analyticsId - The analytics ID to use.
 * @param request.persistedState - The persisted state for all controllers.
 * @param request.initMessenger - The init messenger for remote feature flag subscriptions.
 * @returns The initialized controller.
 */
export const analyticsControllerInit: MessengerClientInitFunction<
  AnalyticsController,
  AnalyticsControllerMessenger,
  AnalyticsControllerInitMessenger
> = ({ controllerMessenger, analyticsId, persistedState, initMessenger }) => {
  const persistedAnalyticsState = persistedState.AnalyticsController;
  const defaultState = getDefaultAnalyticsControllerState();

  const state: AnalyticsControllerState = {
    optedIn: persistedAnalyticsState?.optedIn ?? defaultState.optedIn,
    analyticsId,
  };

  const platformAdapter = isE2E
    ? createE2EPlatformAdapter()
    : createPlatformAdapter([getBrazePlugin()]);

  const controller = new AnalyticsController({
    messenger: controllerMessenger,
    state,
    platformAdapter,
    isAnonymousEventsFeatureEnabled: true,
  });

  controller.init();

  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    syncBrazeAllowlists,
    (flagState) => flagState.remoteFeatureFlags.brazeSegmentForwarding,
  );

  const remoteFeatureFlagControllerState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );

  syncBrazeAllowlists(
    remoteFeatureFlagControllerState.remoteFeatureFlags.brazeSegmentForwarding,
  );

  return {
    controller,
  };
};
