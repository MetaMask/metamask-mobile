import {
  HandleSnapRequest as SnapControllerHandleRequestActionType,
  GetAllSnaps as SnapControllerGetAllActionType,
  SnapInstalled as SnapControllerSnapInstalledEventType,
  SnapUpdated as SnapControllerSnapUpdatedEventType,
  SnapUninstalled as SnapControllerSnapUninstalledEventType,
  SnapEnabled as SnapControllerSnapEnabledEventType,
  SnapDisabled as SnapControllerSnapDisabledEventType,
} from '@metamask/snaps-controllers';
import { GetPermissions as PermissionControllerGetPermissionsAction } from '@metamask/permission-controller';

/**
 * The actions that the CronjobControllerMessenger can use.
 */
export type CronjobControllerMessengerActions =
  | SnapControllerHandleRequestActionType
  | SnapControllerGetAllActionType
  | PermissionControllerGetPermissionsAction;

/**
 * The events that the CronjobControllerMessenger can handle.
 */
export type CronJobControllerMessengerEvents =
  | SnapControllerSnapInstalledEventType
  | SnapControllerSnapUpdatedEventType
  | SnapControllerSnapUninstalledEventType
  | SnapControllerSnapEnabledEventType
  | SnapControllerSnapDisabledEventType;
