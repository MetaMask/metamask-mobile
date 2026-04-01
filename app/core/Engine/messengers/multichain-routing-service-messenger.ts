import { Messenger } from '@metamask/messenger';
import { MultichainRoutingServiceMessenger } from '@metamask/snaps-controllers';
import {
  KeyringControllerAddNewKeyringAction,
  KeyringControllerGetKeyringsByTypeAction,
} from '@metamask/keyring-controller';
import { RootMessenger } from '../types';

/**
 * Get the multichain routing service messenger for the multichain routing
 * service.
 *
 * @param rootMessenger - The root messenger.
 * @returns The multichain routing service messenger.
 */
export function getMultichainRoutingServiceMessenger(
  rootMessenger: RootMessenger,
): MultichainRoutingServiceMessenger {
  const messenger: MultichainRoutingServiceMessenger = new Messenger({
    namespace: 'MultichainRoutingService',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'SnapController:getRunnableSnaps',
      'SnapController:handleRequest',
      'PermissionController:getPermissions',
      'AccountsController:listMultichainAccounts',
    ],
    events: [],
    messenger,
  });

  return messenger;
}

type AllowedInitializationActions =
  | KeyringControllerAddNewKeyringAction
  | KeyringControllerGetKeyringsByTypeAction;

export type MultichainRoutingServiceInitMessenger = ReturnType<
  typeof getMultichainRoutingServiceInitMessenger
>;

/**
 * Get the multichain routing service init messenger for the multichain routing
 * service.
 * multichain router is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The multichain routing service init messenger.
 */
export function getMultichainRoutingServiceInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'MultichainRoutingServiceInit',
    AllowedInitializationActions,
    never,
    RootMessenger
  >({
    namespace: 'MultichainRoutingServiceInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'KeyringController:addNewKeyring',
      'KeyringController:getKeyringsByType',
    ],
    events: [],
    messenger,
  });

  return messenger;
}
