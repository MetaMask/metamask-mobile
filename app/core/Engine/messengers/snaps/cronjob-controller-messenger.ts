import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { CronjobControllerMessenger } from '@metamask/snaps-controllers';
import { RootMessenger } from '../../types';

export { type CronjobControllerMessenger };

/**
 * Get a messenger for the cronjob controller. This is scoped to the
 * actions and events that the cronjob controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The CronjobControllerMessenger.
 */
export function getCronjobControllerMessenger(
  rootMessenger: RootMessenger,
): CronjobControllerMessenger {
  const messenger = new Messenger<
    'CronjobController',
    MessengerActions<CronjobControllerMessenger>,
    MessengerEvents<CronjobControllerMessenger>,
    RootMessenger
  >({
    namespace: 'CronjobController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'PermissionController:getPermissions',
      'SnapController:handleRequest',
    ],
    events: [
      'SnapController:snapInstalled',
      'SnapController:snapUpdated',
      'SnapController:snapUninstalled',
      'SnapController:snapEnabled',
      'SnapController:snapDisabled',
    ],
    messenger,
  });
  return messenger;
}
