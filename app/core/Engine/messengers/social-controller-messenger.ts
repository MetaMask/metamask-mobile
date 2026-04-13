import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { SocialControllerMessenger } from '@metamask/social-controllers';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the SocialController.
 *
 * Delegates SocialService actions so the controller can call
 * the service through the messenger.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SocialControllerMessenger.
 */
export function getSocialControllerMessenger(
  rootMessenger: RootMessenger,
): SocialControllerMessenger {
  const messenger = new Messenger<
    'SocialController',
    MessengerActions<SocialControllerMessenger>,
    MessengerEvents<SocialControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SocialController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'SocialService:fetchLeaderboard',
      'SocialService:follow',
      'SocialService:unfollow',
      'SocialService:fetchFollowing',
    ],
    messenger,
  });
  return messenger;
}
