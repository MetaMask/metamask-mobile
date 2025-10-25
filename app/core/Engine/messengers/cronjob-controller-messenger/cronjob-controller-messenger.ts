import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  CronjobControllerMessenger,
  GetAllSnaps,
} from '@metamask/snaps-controllers';
import {
  SnapControllerHandleRequestAction,
  SnapControllerSnapDisabledEvent,
  SnapControllerSnapEnabledEvent,
  SnapControllerSnapInstalledEvent,
  SnapControllerSnapUninstalledEvent,
  SnapControllerSnapUpdatedEvent,
  SnapControllerGetAllSnapsAction,
} from '../../controllers/snaps';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the CronjobControllerMessenger for the CronjobController.
 *
 * @param rootExtendedMessenger - The base controller messenger.
 * @returns The CronjobControllerMessenger.
 */
export function getCronjobControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): CronjobControllerMessenger {
  const messenger = new Messenger<
    'CronjobController',
    MessengerActions<CronjobControllerMessenger> | GetAllSnaps,
    MessengerEvents<CronjobControllerMessenger>,
    RootMessenger
  >({
    namespace: 'CronjobController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'PermissionController:getPermissions',
      SnapControllerHandleRequestAction,
      SnapControllerGetAllSnapsAction,
    ],
    events: [
      SnapControllerSnapInstalledEvent,
      SnapControllerSnapUpdatedEvent,
      SnapControllerSnapUninstalledEvent,
      SnapControllerSnapEnabledEvent,
      SnapControllerSnapDisabledEvent,
    ],
    messenger,
  });
  return messenger;
}
