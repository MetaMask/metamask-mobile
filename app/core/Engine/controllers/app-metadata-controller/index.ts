import {
  AppMetadataController,
  type AppMetadataControllerState,
  type AppMetadataControllerMessenger,
} from '@metamask/app-metadata-controller';
import { logAppMetadataControllerCreation } from './utils';
import type { ControllerInitFunction } from '../../types';
import { defaultAppMetadataControllerState } from './constants';
import { getVersion } from 'react-native-device-info';
import { version as migrationVersion } from '../../../../store/migrations';

// Export types
export type { AppMetadataControllerMessenger };

// Export constants
export * from './constants';

/**
 * Initialize the AppMetadataController.
 *
 * @param request - The request object.
 * @returns The AppMetadataController.
 */
export const appMetadataControllerInit: ControllerInitFunction<
  AppMetadataController,
  AppMetadataControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  // Get current app version and migration version
  const currentAppVersion = getVersion();
  const currentMigrationVersion = migrationVersion;

  const appMetadataControllerState = {
    ...(persistedState.AppMetadataController ??
      defaultAppMetadataControllerState),
    currentAppVersion,
    currentMigrationVersion,
  } as AppMetadataControllerState;

  logAppMetadataControllerCreation(appMetadataControllerState);

  const controller = new AppMetadataController({
    messenger: controllerMessenger,
    state: appMetadataControllerState,
    currentAppVersion,
    currentMigrationVersion,
  });

  // Update version asynchronously after initialization
  Promise.resolve(getVersion()).then((version: string) => {
    controller.state.currentAppVersion = version;
  });

  return { controller };
};
