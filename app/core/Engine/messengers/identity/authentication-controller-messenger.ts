import { Messenger } from '@metamask/base-controller';
import type {
  KeyringControllerGetStateAction,
  KeyringControllerLockEvent,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type { HandleSnapRequest } from '@metamask/snaps-controllers';

type AllowedActions = HandleSnapRequest | KeyringControllerGetStateAction;
type AllowedEvents = KeyringControllerLockEvent | KeyringControllerUnlockEvent;

export type AuthenticationControllerMessenger = ReturnType<
  typeof getAuthenticationControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * authentication controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getAuthenticationControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'AuthenticationController',
    allowedActions: [
      'KeyringController:getState',
      'SnapController:handleRequest',
    ],
    allowedEvents: ['KeyringController:lock', 'KeyringController:unlock'],
  });
}
