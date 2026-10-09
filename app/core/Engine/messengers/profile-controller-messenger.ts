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
 * @param rootMessenger - The root messenger.
 * @returns The ProfileControllerMessenger.
 */
export function getProfileControllerMessenger(
  rootMessenger: RootMessenger,
): ProfileControllerMessenger {
  const controllerMessenger = new Messenger<
    'ProfileController',
    MessengerActions<ProfileControllerMessenger>,
    MessengerEvents<ProfileControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ProfileController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger: controllerMessenger,
    actions: [
      'ProfileService:createProfile',
      'ProfileService:replaceProfile',
      'ProfileService:updateProfile',
      'ProfileService:deleteProfile',
      'ProfileService:checkUsernameAvailability',
      'ProfileService:connectX',
      'ProfileService:getXAccount',
    ],
  });

  return controllerMessenger;
}
