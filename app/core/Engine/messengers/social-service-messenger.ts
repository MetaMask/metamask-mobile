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
  rootMessenger: RootMessenger,
): SocialServiceMessenger {
  return new Messenger<
    'SocialService',
    MessengerActions<SocialServiceMessenger>,
    MessengerEvents<SocialServiceMessenger>,
    RootMessenger
  >({
    namespace: 'SocialService',
    parent: rootMessenger,
  });
}
