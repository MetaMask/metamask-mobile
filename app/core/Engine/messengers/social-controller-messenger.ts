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
  rootMessenger: RootMessenger<
    MessengerActions<SocialControllerMessenger>,
    MessengerEvents<SocialControllerMessenger>
  >,
): SocialControllerMessenger {
  const messenger: SocialControllerMessenger = new Messenger({
    namespace: 'SocialController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'SocialService:fetchLeaderboard',
      'SocialService:follow',
      'SocialService:unfollow',
      'SocialService:fetchFollowing',
      'SocialService:optOutOfLeaderboard',
      'SocialService:optInToLeaderboard',
    ],
    messenger,
  });
  return messenger;
}
