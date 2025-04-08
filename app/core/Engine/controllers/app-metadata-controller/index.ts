import type { ControllerInitFunction } from '../../types';
import {
  AppMetadataController,
  type AppMetadataControllerState,
} from '@metamask/app-metadata-controller';
import { logAppMetadataControllerCreation } from './utils';
import { defaultAppMetadataControllerState } from './constants';

// Export constants
export * from './constants';

/**
 * Initialize the AppMetadataController.
 *
 * @param request - The request object.
 * @returns The AppMetadataController.
 */
export const appMetadataControllerInit = (request: any) => {
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
