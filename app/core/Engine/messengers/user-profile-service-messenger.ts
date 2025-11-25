import { UserProfileServiceMessenger } from '@metamask/user-profile-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

type AllowedActions = MessengerActions<UserProfileServiceMessenger>;

type AllowedEvents = MessengerEvents<UserProfileServiceMessenger>;

/**
 * Create a messenger restricted to the allowed actions and events of the
 * accounts controller.
 *
 * @param messenger - The base messenger used to create the restricted
 * messenger.
 */
export function getUserProfileServiceMessenger(
  messenger: RootMessenger,
): UserProfileServiceMessenger {
  const serviceMessenger = new Messenger<
    'UserProfileService',
    AllowedActions,
    AllowedEvents,
    typeof messenger
  >({
    namespace: 'UserProfileService',
    parent: messenger,
  });
  messenger.delegate({
    messenger: serviceMessenger,
    actions: ['AuthenticationController:getBearerToken'],
  });
  return serviceMessenger;
}
