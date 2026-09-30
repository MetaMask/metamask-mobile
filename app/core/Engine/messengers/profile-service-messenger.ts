import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ProfileServiceMessenger } from '@metamask/profile-controller';
import type { RootMessenger } from '../types';

/**
 * Messenger for ProfileService.
 *
 * Every profile request authenticates with AuthenticationController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ProfileService messenger.
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
