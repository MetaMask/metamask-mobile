import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ProfileControllerMessenger } from '@metamask/profile-controller';
import type { RootMessenger } from '../types';

/**
 * Messenger for ProfileController.
 *
 * Delegates the ProfileService writes and reads the controller calls.
 * `getXAuthUrl` stays on the service: the controller does not expose it.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ProfileController messenger.
 */
export function getProfileControllerMessenger(
  rootMessenger: RootMessenger,
): ProfileControllerMessenger {
  const messenger = new Messenger<
    'ProfileController',
    MessengerActions<ProfileControllerMessenger>,
    MessengerEvents<ProfileControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ProfileController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ProfileService:createProfile',
      'ProfileService:replaceProfile',
      'ProfileService:updateProfile',
      'ProfileService:deleteProfile',
      'ProfileService:checkUsernameAvailability',
      'ProfileService:connectX',
      'ProfileService:getXAccount',
    ],
    messenger,
  });
  return messenger;
}
