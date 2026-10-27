import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type {
  SocialControllerMessenger,
  SocialServiceRefreshNotificationPreferencesCacheAction,
} from '@metamask/social-controllers';
import type { RootMessenger } from '../types';

type SocialControllerMessengerActions =
  | MessengerActions<SocialControllerMessenger>
  | SocialServiceRefreshNotificationPreferencesCacheAction;

type SocialControllerMessengerWithNotificationCache = Messenger<
  'SocialController',
  SocialControllerMessengerActions,
  MessengerEvents<SocialControllerMessenger>,
  RootMessenger
>;

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
): SocialControllerMessengerWithNotificationCache {
  const messenger = new Messenger<
    'SocialController',
    SocialControllerMessengerActions,
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
      'SocialService:optOutOfLeaderboard',
      'SocialService:optInToLeaderboard',
      'SocialService:refreshNotificationPreferencesCache',
    ],
    messenger,
  });
  return messenger;
}
