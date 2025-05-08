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
      'KeyringController:withKeyring',
      // Snap Controller Requests
      'SnapController:handleRequest',
      // Auth Controller Requests
      'AuthenticationController:getBearerToken',
      'AuthenticationController:getSessionProfile',
      'AuthenticationController:isSignedIn',
      'AuthenticationController:performSignIn',
      // Accounts Controller Requests
      'AccountsController:listAccounts',
      'AccountsController:updateAccountMetadata',
      // Network Controller Requests
      'NetworkController:getState',
      'NetworkController:addNetwork',
      'NetworkController:removeNetwork',
      'NetworkController:updateNetwork',
    ],
    allowedEvents: [
      // Keyring Controller Events
      'KeyringController:lock',
      'KeyringController:unlock',
      // Accounts Controller Events
      'AccountsController:accountAdded',
      'AccountsController:accountRenamed',
      // Network Controller Events
      'NetworkController:networkRemoved',
    ],
  });
}
