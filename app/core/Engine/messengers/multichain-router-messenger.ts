import { Messenger } from '@metamask/base-controller';
import { GetAllSnaps, HandleSnapRequest } from '@metamask/snaps-controllers';
import { GetPermissions } from '@metamask/permission-controller';
import { AccountsControllerListMultichainAccountsAction } from '@metamask/accounts-controller';
import {
  KeyringControllerAddNewKeyringAction,
  KeyringControllerGetKeyringsByTypeAction,
} from '@metamask/keyring-controller';

type AllowedActions =
  | GetAllSnaps
  | HandleSnapRequest
  | GetPermissions
  | AccountsControllerListMultichainAccountsAction;

type AllowedEvents = never;

export type MultichainRouterMessenger = ReturnType<
  typeof getMultichainRouterMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * multichain router is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getMultichainRouterMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'MultichainRouter',
    allowedActions: [
      'SnapController:getAll',
      'SnapController:handleRequest',
      'PermissionController:getPermissions',
      'AccountsController:listMultichainAccounts',
    ],
    allowedEvents: [],
  });
}

type AllowedInitializationActions =
  | KeyringControllerAddNewKeyringAction
  | KeyringControllerGetKeyringsByTypeAction;

export type MultichainRouterInitMessenger = ReturnType<
  typeof getMultichainRouterInitMessenger
>;

/**
 * Get a messenger restricted to the initialization actions that the
 * multichain router is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getMultichainRouterInitMessenger(
  messenger: Messenger<AllowedInitializationActions, never>,
) {
  return messenger.getRestricted({
    name: 'MultichainRouterInit',
    allowedActions: [
      'KeyringController:addNewKeyring',
      'KeyringController:getKeyringsByType',
    ],
    allowedEvents: [],
  });
}
