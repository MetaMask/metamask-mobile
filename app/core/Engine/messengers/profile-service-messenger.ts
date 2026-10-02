import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ProfileServiceMessenger } from '@metamask/profile-controller';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the ProfileService.
 *
 * Delegates the AuthenticationController bearer token action so the
 * service can authenticate requests to the Profile API.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ProfileServiceMessenger.
 */
export function getProfileServiceMessenger(
  rootMessenger: RootMessenger,
): ProfileServiceMessenger {
  const serviceMessenger = new Messenger<
    'ProfileService',
    MessengerActions<ProfileServiceMessenger>,
    MessengerEvents<ProfileServiceMessenger>,
    RootMessenger
  >({
    namespace: 'ProfileService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: serviceMessenger,
    actions: ['AuthenticationController:getBearerToken'],
  });
  return serviceMessenger;
}
