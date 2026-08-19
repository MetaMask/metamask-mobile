import {
  SnapControllerHandleRequestAction as SnapControllerHandleRequestActionType,
  SnapControllerGetAllSnapsAction as SnapControllerGetAllActionType,
  SnapControllerSnapInstalledEvent as SnapControllerSnapInstalledEventType,
  SnapControllerSnapUpdatedEvent as SnapControllerSnapUpdatedEventType,
  SnapControllerSnapUninstalledEvent as SnapControllerSnapUninstalledEventType,
  SnapControllerSnapEnabledEvent as SnapControllerSnapEnabledEventType,
  SnapControllerSnapDisabledEvent as SnapControllerSnapDisabledEventType,
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
