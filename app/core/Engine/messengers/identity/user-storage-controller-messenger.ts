import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { UserStorageControllerMessenger } from '@metamask/profile-sync-controller/user-storage';
import { RootMessenger } from '../../types';

/**
 * Get a messenger for the user storage controller. This is scoped to the
 * user storage controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The UserStorageControllerMessenger.
 */
export function getUserStorageControllerMessenger(
  rootMessenger: RootMessenger,
): UserStorageControllerMessenger {
  const messenger = new Messenger<
    'UserStorageController',
    MessengerActions<UserStorageControllerMessenger>,
    MessengerEvents<UserStorageControllerMessenger>,
    RootMessenger
  >({
    namespace: 'UserStorageController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
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
    events: [
      'KeyringController:lock',
      'KeyringController:unlock',
      'AddressBookController:contactUpdated',
      'AddressBookController:contactDeleted',
    ],
    messenger,
  });
  return messenger;
}
