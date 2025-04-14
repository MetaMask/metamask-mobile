import { AppMetadataControllerState } from '@metamask/app-metadata-controller';
import Logger from '../../../../util/Logger';
import { defaultAppMetadataControllerState } from './constants';

export function logAppMetadataControllerCreation(
  initialState?: Partial<AppMetadataControllerState>,
) {
  if (!initialState) {
    Logger.log('Creating AppMetadataController with default state', {
      defaultState: defaultAppMetadataControllerState,
    });
  } else {
    Logger.log('Creating AppMetadataController with provided initial state', {
      currentAppVersion: initialState.currentAppVersion || '',
      previousAppVersion: initialState.previousAppVersion || '',
      currentMigrationVersion: initialState.currentMigrationVersion || 0,
      previousMigrationVersion: initialState.previousMigrationVersion || 0,
    });
  }
}
