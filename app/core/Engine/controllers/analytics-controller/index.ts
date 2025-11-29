import { ControllerInitFunction } from '../../types';
import {
  AnalyticsController,
  type AnalyticsControllerMessenger,
  type AnalyticsControllerState,
  type AnalyticsUserTraits,
} from '@metamask/analytics-controller';
import { createPlatformAdapter } from './platform-adapter';
import Logger from '../../../../util/Logger';
import generateDeviceAnalyticsMetaData from '../../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData';
import generateUserSettingsAnalyticsMetaData from '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  ANALYTICS_OPTED_IN_REGULAR,
  ANALYTICS_OPTED_IN_SOCIAL,
} from '../../../../constants/storage';

/**
 * Initialize the AnalyticsController.
 *
 * @param request - The request object.
 * @returns The AnalyticsController.
 */
export const analyticsControllerInit: ControllerInitFunction<
  AnalyticsController,
  AnalyticsControllerMessenger
> = (request) => {
  Logger.log('Initializing AnalyticsController');

  const { controllerMessenger, analyticsDefaults } = request;

  // TODO: in case of e2e, use a mock platform adapter
  // see app/core/Analytics/MetaMetricsTestUtils.ts for more details
  const platformAdapter = createPlatformAdapter();

  // Create controller with state from analyticsDefaults
  const controller = new AnalyticsController({
    messenger: controllerMessenger,
    state: analyticsDefaults, // Pass full defaults object as state
    platformAdapter,
  });

  // Subscribe to individual fields - only persists what changed
  // analyticsId never changes after init, so no need to subscribe to it
  controllerMessenger.subscribe(
    'AnalyticsController:stateChange',
    (state: AnalyticsControllerState) => state.optedInForRegularAccount,
    async (optedIn: boolean) => {
      try {
        await StorageWrapper.setItem(
          ANALYTICS_OPTED_IN_REGULAR,
          String(optedIn),
          { emitEvent: false },
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'AnalyticsController: Failed to sync optedInForRegularAccount to MMKV',
        );
      }
    },
  );
  controllerMessenger.subscribe(
    'AnalyticsController:stateChange',
    (state: AnalyticsControllerState) => state.optedInForSocialAccount,
    async (optedIn: boolean) => {
      try {
        await StorageWrapper.setItem(
          ANALYTICS_OPTED_IN_SOCIAL,
          String(optedIn),
          { emitEvent: false },
        );
      } catch (error) {
        Logger.error(
          error as Error,
          'AnalyticsController: Failed to sync optedInForSocialAccount to MMKV',
        );
      }
    },
  );

  // Identify user with the latest traits after controller is initialized
  // Note this will only fire identify if user opted in to analytics
  const consolidatedTraits = {
    ...generateDeviceAnalyticsMetaData(),
    ...generateUserSettingsAnalyticsMetaData(),
  };
  controller.identify(consolidatedTraits as AnalyticsUserTraits);

  return { controller };
};
