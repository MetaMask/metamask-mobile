import type { AuthenticationControllerMessenger } from '@metamask/profile-sync-controller/auth';
import { BaseControllerMessenger } from '../../types';

export function getAuthenticationControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): AuthenticationControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'AuthenticationController',
    allowedActions: [
      // Keyring Controller Requests
      'KeyringController:getState',
      // Snap Controller Requests
      'SnapController:handleRequest',
    ],
    allowedEvents: [
      // Keyring Controller Events
      'KeyringController:lock',
      'KeyringController:unlock',
    ],
  });
}
