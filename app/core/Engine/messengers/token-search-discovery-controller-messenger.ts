import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { type TokenSearchDiscoveryControllerMessenger } from '@metamask/token-search-discovery-controller';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the token search discovery controller. This is scoped to the
 * actions and events that the token search discovery controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokenSearchDiscoveryControllerMessenger.
 */
export function getTokenSearchDiscoveryControllerMessenger(
  rootMessenger: RootMessenger,
): TokenSearchDiscoveryControllerMessenger {
  const messenger = new Messenger<
    'TokenSearchDiscoveryController',
    MessengerActions<TokenSearchDiscoveryControllerMessenger>,
    MessengerEvents<TokenSearchDiscoveryControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TokenSearchDiscoveryController',
    parent: rootMessenger,
  });
  return messenger;
}
