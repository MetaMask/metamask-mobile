import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ProfileServiceMessenger } from '@metamask/profile-controller';
import type { RootMessenger } from '../types';
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
