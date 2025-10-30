import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { MultichainRouterMessenger } from '@metamask/snaps-controllers';
import {
  KeyringControllerAddNewKeyringAction,
  KeyringControllerGetKeyringsByTypeAction,
} from '@metamask/keyring-controller';
import { RootMessenger } from '../types';

/**
 * Get the MultichainRouterMessenger for the MultichainRouter.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainRouterMessenger.
 */
export function getMultichainRouterMessenger(
  rootMessenger: RootMessenger,
): MultichainRouterMessenger {
  const messenger = new Messenger<
    'MultichainRouter',
    MessengerActions<MultichainRouterMessenger>,
    MessengerEvents<MultichainRouterMessenger>,
    RootMessenger
  >({
    namespace: 'MultichainRouter',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'SnapController:getAll',
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

export type MultichainRouterInitMessenger = ReturnType<
  typeof getMultichainRouterInitMessenger
>;

/**
 * Get the MultichainRouterInitMessenger for the MultichainRouter.
 * multichain router is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainRouterInitMessenger.
 */
export function getMultichainRouterInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'MultichainRouterInit',
    AllowedInitializationActions,
    never,
    RootMessenger
  >({
    namespace: 'MultichainRouterInit',
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
