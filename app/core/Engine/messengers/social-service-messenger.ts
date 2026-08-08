import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { SocialServiceMessenger } from '@metamask/social-controllers';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the SocialService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SocialServiceMessenger.
 */
export function getSocialServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<SocialServiceMessenger>,
    MessengerEvents<SocialServiceMessenger>
  >,
): SocialServiceMessenger {
  const serviceMessenger: SocialServiceMessenger = new Messenger({
    namespace: 'SocialService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger: serviceMessenger,
    actions: ['AuthenticationController:getBearerToken'],
  });
  return serviceMessenger;
}
