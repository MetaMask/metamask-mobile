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
  rootMessenger: RootMessenger<
    MessengerActions<TokenRatesControllerMessenger>,
    MessengerEvents<TokenRatesControllerMessenger>
  >,
): TokenRatesControllerMessenger {
  const messenger: TokenRatesControllerMessenger = new Messenger({
    namespace: 'TokenRatesController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'TokensController:getState',
      'NetworkController:getState',
      'NetworkEnablementController:getState',
    ],
    events: ['TokensController:stateChange', 'NetworkController:stateChange'],
    messenger,
  });
  return messenger;
}
