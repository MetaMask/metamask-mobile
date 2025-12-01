import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { TokenRatesControllerMessenger } from '@metamask/assets-controllers';
import { RootMessenger } from '../types';
/**
 * Get the messenger for the token rates controller. This is scoped to the
 * actions and events that the token rates controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokenRatesControllerMessenger.
 */
export function getTokenRatesControllerMessenger(
  rootMessenger: RootMessenger,
): TokenRatesControllerMessenger {
  const messenger = new Messenger<
    'TokenRatesController',
    MessengerActions<TokenRatesControllerMessenger>,
    MessengerEvents<TokenRatesControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TokenRatesController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['TokensController:getState', 'NetworkController:getState'],
    events: ['TokensController:stateChange', 'NetworkController:stateChange'],
    messenger,
  });
  return messenger;
}
