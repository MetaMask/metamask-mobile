import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { NetworkControllerGetSelectedNetworkClientAction } from '@metamask/network-controller';

import { TokensControllerMessenger } from '@metamask/assets-controllers';
import { RootMessenger } from '../types';

/**
 * Get the messenger for the tokens controller. This is scoped to the
 * tokens controller is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokensControllerMessenger.
 */
export function getTokensControllerMessenger(
  rootMessenger: RootMessenger,
): TokensControllerMessenger {
  const messenger = new Messenger<
    'TokensController',
    MessengerActions<TokensControllerMessenger>,
    MessengerEvents<TokensControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TokensController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ApprovalController:addRequest',
      'NetworkController:getNetworkClientById',
      'AccountsController:getAccount',
      'AccountsController:getSelectedAccount',
      'AccountsController:listAccounts',
    ],
    events: [
      'NetworkController:networkDidChange',
      'NetworkController:stateChange',
      'TokenListController:stateChange',
      'AccountsController:selectedEvmAccountChange',
      'KeyringController:accountRemoved',
    ],
    messenger,
  });
  return messenger;
}

type AllowedInitializationActions =
  NetworkControllerGetSelectedNetworkClientAction;

type AllowedInitializationEvents = never;

export type TokensControllerInitMessenger = ReturnType<
  typeof getTokensControllerInitMessenger
>;

/**
 * Get the messenger for the tokens controller initialization. This is scoped to the
 * actions and events that the tokens controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokensControllerInitMessenger.
 */
export function getTokensControllerInitMessenger(rootMessenger: RootMessenger) {
  const messenger = new Messenger<
    'TokensControllerInit',
    AllowedInitializationActions,
    AllowedInitializationEvents,
    RootMessenger
  >({
    namespace: 'TokensControllerInit',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['NetworkController:getSelectedNetworkClient'],
    events: [],
    messenger,
  });
  return messenger;
}
