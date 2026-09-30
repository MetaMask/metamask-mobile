import { ProfileControllerMessenger } from '@metamask/profile-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

type AllowedActions = MessengerActions<ProfileControllerMessenger>;

type AllowedEvents = MessengerEvents<ProfileControllerMessenger>;

/**
 * Create a messenger restricted to the allowed actions and events of the
 * profile controller.
 *
 * @param rootMessenger - The base messenger used to create the restricted
 * messenger.
 */
export function getProfileControllerMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): ProfileControllerMessenger {
  const profileControllerMessenger: ProfileControllerMessenger = new Messenger({
    namespace: 'ProfileController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: profileControllerMessenger,
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
  return profileControllerMessenger;
}
