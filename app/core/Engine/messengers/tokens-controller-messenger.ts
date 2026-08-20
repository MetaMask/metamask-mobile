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
  rootMessenger: RootMessenger<
    MessengerActions<TokensControllerMessenger>,
    MessengerEvents<TokensControllerMessenger>
  >,
): TokensControllerMessenger {
  const messenger: TokensControllerMessenger = new Messenger({
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

export type TokensControllerInitMessenger = Messenger<
  'TokensControllerInit',
  AllowedInitializationActions,
  AllowedInitializationEvents
>;

/**
 * Get the messenger for the tokens controller initialization. This is scoped to the
 * actions and events that the tokens controller is allowed to handle during
 * initialization.
 *
 * @param rootMessenger - The root messenger.
 * @returns The TokensControllerInitMessenger.
 */
export function getTokensControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<TokensControllerInitMessenger>,
    MessengerEvents<TokensControllerInitMessenger>
  >,
): TokensControllerInitMessenger {
  const messenger: TokensControllerInitMessenger = new Messenger({
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
