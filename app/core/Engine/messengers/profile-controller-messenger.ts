import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ProfileControllerMessenger } from '@metamask/profile-controller';
import type { RootMessenger } from '../types';
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
      'ProfileService:getProfile',
      'ProfileService:createProfile',
      'ProfileService:replaceProfile',
      'ProfileService:updateProfile',
      'ProfileService:deleteProfile',
      'ProfileService:checkUsernameAvailability',
      'ProfileService:getXAuthUrl',
      'ProfileService:connectX',
      'ProfileService:getXAccount',
      'ProfileService:disconnectX',
    ],
  });
  return controllerMessenger;
}
