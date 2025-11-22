import { ControllerInitFunction } from '../../types';
import {
  AnalyticsController,
  type AnalyticsControllerMessenger,
  type AnalyticsUserTraits,
} from '@metamask/analytics-controller';
import { createPlatformAdapter } from './platform-adapter';
import Logger from '../../../../util/Logger';
import generateDeviceAnalyticsMetaData from '../../../../util/metrics/DeviceAnalyticsMetaData/generateDeviceAnalyticsMetaData';
import generateUserSettingsAnalyticsMetaData from '../../../../util/metrics/UserSettingsAnalyticsMetaData/generateUserProfileAnalyticsMetaData';

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

  const { controllerMessenger, persistedState } = request;

  // TODO: in case of e2e, use a mock platform adapter
  // see app/core/Analytics/MetaMetricsTestUtils.ts for more details
  const platformAdapter = createPlatformAdapter();

  // Create controller with persisted state if available (migrated or not - transparent to controller)
  // If no persisted state, controller will use defaults
  const controller = new AnalyticsController({
    messenger: controllerMessenger,
    ...(persistedState?.AnalyticsController && {
      state: persistedState.AnalyticsController,
    }),
    platformAdapter,
  });

  // Identify user with the latest traits after controller is initialized
  // Note this will only fire identify if user opted in to analytics
  const consolidatedTraits = {
    ...generateDeviceAnalyticsMetaData(),
    ...generateUserSettingsAnalyticsMetaData(),
  };
  controller.identify(consolidatedTraits as AnalyticsUserTraits);

  return { controller };
};
