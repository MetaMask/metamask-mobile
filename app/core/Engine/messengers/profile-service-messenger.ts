import { ProfileServiceMessenger } from '@metamask/profile-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

type AllowedActions = MessengerActions<ProfileServiceMessenger>;

type AllowedEvents = MessengerEvents<ProfileServiceMessenger>;

/**
 * Create a messenger restricted to the allowed actions and events of the
 * profile service.
 *
 * @param rootMessenger - The base messenger used to create the restricted
 * messenger.
 */
export function getProfileServiceMessenger(
  rootMessenger: RootMessenger<AllowedActions, AllowedEvents>,
): ProfileServiceMessenger {
  const serviceMessenger: ProfileServiceMessenger = new Messenger({
    namespace: 'ProfileService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: serviceMessenger,
    actions: ['AuthenticationController:getBearerToken'],
  });
  return serviceMessenger;
}
