import { BaseControllerMessenger } from '../../types';
import { CronjobControllerMessenger } from '@metamask/snaps-controllers';
import {
  SnapControllerHandleRequestAction,
  SnapControllerSnapDisabledEvent,
  SnapControllerSnapEnabledEvent,
  SnapControllerSnapInstalledEvent,
  SnapControllerSnapUninstalledEvent,
  SnapControllerSnapUpdatedEvent,
  SnapControllerGetAllSnapsAction,
} from '../../controllers/snaps';

/**
 * Get the CronjobControllerMessenger for the CronjobController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The CronjobControllerMessenger.
 */
export function getCronjobControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): CronjobControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'CronjobController',
    allowedEvents: [
      SnapControllerSnapInstalledEvent,
      SnapControllerSnapUpdatedEvent,
      SnapControllerSnapUninstalledEvent,
      SnapControllerSnapEnabledEvent,
      SnapControllerSnapDisabledEvent,
    ],
    allowedActions: [
      `PermissionController:getPermissions`,
      SnapControllerHandleRequestAction,
      SnapControllerGetAllSnapsAction,
    ],
  });
}
