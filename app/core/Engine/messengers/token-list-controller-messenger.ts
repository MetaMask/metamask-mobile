import { TokenListControllerMessenger } from '@metamask/assets-controllers';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { NetworkControllerStateChangeEvent } from '@metamask/network-controller';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the tokenList controller. This is scoped to the
 * actions and events that the tokenList controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokenListControllerMessenger.
 */
export function getTokenListControllerMessenger(
  rootMessenger: RootMessenger,
): TokenListControllerMessenger {
  const messenger = new Messenger<
    'TokenListController',
    MessengerActions<TokenListControllerMessenger>,
    MessengerEvents<TokenListControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TokenListController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['NetworkController:getNetworkClientById'],
    events: ['NetworkController:stateChange'],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions = never;

type AllowedInitializationEvents = NetworkControllerStateChangeEvent;

export type TokenListControllerInitMessenger = ReturnType<
  typeof getTokenListControllerInitMessenger
>;

/**
 * Get the messenger for the tokenList controller initialization. This is scoped to the
 * actions and events that the tokenList controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokenListControllerInitMessenger.
 */
export function getTokenListControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'TokenListControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'TokenListControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [],
    events: ['NetworkController:stateChange'],
    messenger,
  });
  return messenger;
}
