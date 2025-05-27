import {
  AppMetadataController,
  AppMetadataControllerMessenger,
  getDefaultAppMetadataControllerState,
} from '@metamask/app-metadata-controller';
import { getVersion } from 'react-native-device-info';
import { version as migrationVersion } from '../../../../store/migrations';
import type { ControllerInitRequest } from '../../types';
import { logAppMetadataControllerCreation } from './utils';

export function appMetadataControllerInit(
  initRequest: ControllerInitRequest<AppMetadataControllerMessenger>,
): { controller: AppMetadataController } {
  const currentVersion = getVersion();
  const currentState =
    initRequest.persistedState?.AppMetadataController ||
    getDefaultAppMetadataControllerState();

  const controller = new AppMetadataController({
    state: currentState,
    messenger: initRequest.controllerMessenger,
    currentAppVersion: currentVersion,
    currentMigrationVersion: migrationVersion,
  });

  logAppMetadataControllerCreation(controller.state);
  return { controller };
}
