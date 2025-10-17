import type { UserStorageControllerMessenger } from '@metamask/profile-sync-controller/user-storage';
import { BaseControllerMessenger } from '../../types';

export function getUserStorageControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): UserStorageControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'UserStorageController',
    allowedActions: [
      // Keyring Controller Requests
      'KeyringController:getState',
      // Snap Controller Requests
      'SnapController:handleRequest',
      // Auth Controller Requests
      'AuthenticationController:getBearerToken',
      'AuthenticationController:getSessionProfile',
      'AuthenticationController:isSignedIn',
      'AuthenticationController:performSignIn',
      // Address Book Controller Requests
      'AddressBookController:list',
      'AddressBookController:set',
      'AddressBookController:delete',
    ],
    allowedEvents: [
      // Keyring Controller Events
      'KeyringController:lock',
      'KeyringController:unlock',
      // Address Book Controller Events
      'AddressBookController:contactUpdated',
      'AddressBookController:contactDeleted',
    ],
  });
}
