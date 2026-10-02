import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ProfileControllerMessenger } from '@metamask/profile-controller';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the ProfileController.
 *
 * Delegates ProfileService actions so the controller can call
 * the service through the messenger.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ProfileControllerMessenger.
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
      'ProfileService:getProfile',
      'ProfileService:getXAccount',
      'ProfileService:getXAuthUrl',
      'ProfileService:disconnectX',
    ],
    messenger,
  });
  return messenger;
}
