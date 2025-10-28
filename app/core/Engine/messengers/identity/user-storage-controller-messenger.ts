import { Messenger } from '@metamask/base-controller';
import {
  type KeyringControllerGetStateAction,
  type KeyringControllerLockEvent,
  type KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type { HandleSnapRequest } from '@metamask/snaps-controllers';
import type {
  AddressBookControllerActions,
  AddressBookControllerContactDeletedEvent,
  AddressBookControllerContactUpdatedEvent,
  AddressBookControllerDeleteAction,
  AddressBookControllerListAction,
  AddressBookControllerSetAction,
} from '@metamask/address-book-controller';
import {
  AuthenticationControllerIsSignedIn,
  AuthenticationControllerGetBearerToken,
  AuthenticationControllerGetSessionProfile,
  AuthenticationControllerPerformSignIn,
} from '@metamask/profile-sync-controller/auth';
import { UserStorageControllerStateChangeEvent } from '@metamask/profile-sync-controller/user-storage';

type AllowedActions =
  | KeyringControllerGetStateAction
  | HandleSnapRequest
  | AuthenticationControllerGetBearerToken
  | AuthenticationControllerGetSessionProfile
  | AuthenticationControllerPerformSignIn
  | AuthenticationControllerIsSignedIn
  | AddressBookControllerListAction
  | AddressBookControllerSetAction
  | AddressBookControllerDeleteAction
  | AddressBookControllerActions;

type AllowedEvents =
  | UserStorageControllerStateChangeEvent
  | KeyringControllerLockEvent
  | KeyringControllerUnlockEvent
  | AddressBookControllerContactUpdatedEvent
  | AddressBookControllerContactDeletedEvent;

export type UserStorageControllerMessenger = ReturnType<
  typeof getUserStorageControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * user storage controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getUserStorageControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'UserStorageController',
    allowedActions: [
      'KeyringController:getState',
      'SnapController:handleRequest',
      'AuthenticationController:getBearerToken',
      'AuthenticationController:getSessionProfile',
      'AuthenticationController:isSignedIn',
      'AuthenticationController:performSignIn',
      'AddressBookController:list',
      'AddressBookController:set',
      'AddressBookController:delete',
    ],
    allowedEvents: [
      'KeyringController:lock',
      'KeyringController:unlock',
      'AddressBookController:contactUpdated',
      'AddressBookController:contactDeleted',
    ],
  });
}
