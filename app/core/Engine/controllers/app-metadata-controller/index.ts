import {
  AppMetadataController,
  type AppMetadataControllerState,
  type AppMetadataControllerMessenger,
} from '@metamask/app-metadata-controller';
import { logAppMetadataControllerCreation } from './utils';
import { defaultAppMetadataControllerState } from './constants';

interface AppMetadataControllerInitRequest {
  controllerMessenger: AppMetadataControllerMessenger;
  persistedState: {
    AppMetadataController?: AppMetadataControllerState;
  };
}

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
export const appMetadataControllerInit = (
  request: AppMetadataControllerInitRequest,
) => {
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
