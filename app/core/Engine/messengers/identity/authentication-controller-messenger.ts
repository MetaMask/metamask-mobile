import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { AuthenticationControllerMessenger } from '@metamask/profile-sync-controller/auth';
import { RootMessenger } from '../../types';

const name = 'AuthenticationController';

/**
 * Get a messenger for the authentication controller. This is scoped to the
 * authentication controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AuthenticationControllerMessenger.
 */
export function getAuthenticationControllerMessenger(
  rootMessenger: RootMessenger,
): AuthenticationControllerMessenger {
  const messenger = new Messenger<
    typeof name,
    MessengerActions<AuthenticationControllerMessenger>,
    MessengerEvents<AuthenticationControllerMessenger>,
    RootMessenger
  >({
    namespace: name,
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['KeyringController:getState', 'SnapController:handleRequest'],
    events: ['KeyringController:lock', 'KeyringController:unlock'],
    messenger,
  });
  return messenger;
}

export type AuthenticationControllerInitMessenger = ReturnType<
  typeof getAuthenticationControllerInitMessenger
>;

/**
 * Get the init messenger for the authentication controller. This is scoped to the
 * actions and events that the authentication controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AuthenticationControllerInitMessenger.
 */
export function getAuthenticationControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'AuthenticationControllerInit',
    never,
    never,
    RootMessenger
  >({
    namespace: 'AuthenticationControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: [],
    messenger,
  });
  return messenger;
}
