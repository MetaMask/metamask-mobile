import type { AppMetadataControllerState } from '@metamask/app-metadata-controller';

// Default AppMetadataControllerState
export const defaultAppMetadataControllerState: AppMetadataControllerState = {
  currentAppVersion: '',
  previousAppVersion: '',
  previousMigrationVersion: 0,
  currentMigrationVersion: 0,
};
