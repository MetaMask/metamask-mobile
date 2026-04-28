import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { AuthenticatedUserStorageMessenger } from '@metamask/authenticated-user-storage';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the AuthenticatedUserStorageService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AuthenticatedUserStorageMessenger.
 */
export function getAuthenticatedUserStorageServiceMessenger(
  rootMessenger: RootMessenger,
): AuthenticatedUserStorageMessenger {
  const serviceMessenger = new Messenger<
    'AuthenticatedUserStorageService',
    MessengerActions<AuthenticatedUserStorageMessenger>,
    MessengerEvents<AuthenticatedUserStorageMessenger>,
    RootMessenger
  >({
    namespace: 'AuthenticatedUserStorageService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: serviceMessenger,
    actions: ['AuthenticationController:getBearerToken'],
  });
  return serviceMessenger;
}
