import {
  AppMetadataController,
  type AppMetadataControllerState,
  type AppMetadataControllerMessenger,
} from '@metamask/app-metadata-controller';
import { logAppMetadataControllerCreation } from './utils';
import type { ControllerInitFunction } from '../../types';
import { defaultAppMetadataControllerState } from './constants';

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

  const appMetadataControllerState = (persistedState.AppMetadataController ??
    defaultAppMetadataControllerState) as AppMetadataControllerState;

  logAppMetadataControllerCreation(appMetadataControllerState);

  const controller = new AppMetadataController({
    messenger: controllerMessenger,
    state: appMetadataControllerState,
  });

  return { controller };
};
