import {
  ControllerStateChangeEvent,
  Messenger,
} from '@metamask/base-controller';
import { AddApprovalRequest } from '@metamask/approval-controller';
import {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetSelectedNetworkClientAction,
  NetworkControllerNetworkDidChangeEvent,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import {
  AccountsControllerGetAccountAction,
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerListAccountsAction,
  AccountsControllerSelectedEvmAccountChangeEvent,
} from '@metamask/accounts-controller';
import {
  TokenListController,
  TokensControllerStateChangeEvent,
} from '@metamask/assets-controllers';
import { KeyringControllerAccountRemovedEvent } from '@metamask/keyring-controller';

type AllowedActions =
  | AddApprovalRequest
  | NetworkControllerGetNetworkClientByIdAction
  | AccountsControllerGetAccountAction
  | AccountsControllerGetSelectedAccountAction
  | AccountsControllerListAccountsAction;

type AllowedEvents =
  | AccountsControllerSelectedEvmAccountChangeEvent
  | KeyringControllerAccountRemovedEvent
  | NetworkControllerNetworkDidChangeEvent
  | NetworkControllerStateChangeEvent
  | TokensControllerStateChangeEvent
  | ControllerStateChangeEvent<
      'TokenListController',
      TokenListController['state']
    >;

export type TokensControllerMessenger = ReturnType<
  typeof getTokensControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * tokens controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokensControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'TokensController',
    allowedActions: [
      'ApprovalController:addRequest',
      'NetworkController:getNetworkClientById',
      'AccountsController:getAccount',
      'AccountsController:getSelectedAccount',
      'AccountsController:listAccounts',
    ],
    allowedEvents: [
      'NetworkController:networkDidChange',
      'NetworkController:stateChange',
      'TokenListController:stateChange',
      'AccountsController:selectedEvmAccountChange',
      'KeyringController:accountRemoved',
    ],
  });
}

type AllowedInitializationActions =
  NetworkControllerGetSelectedNetworkClientAction;

type AllowedInitializationEvents = never;

export type TokensControllerInitMessenger = ReturnType<
  typeof getTokensControllerInitMessenger
>;

/**
 * Get a messenger restricted to the initialization actions that the
 * tokens controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokensControllerInitMessenger(
  messenger: Messenger<
    AllowedInitializationActions,
    AllowedInitializationEvents
  >,
) {
  return messenger.getRestricted({
    name: 'TokensControllerInit',
    allowedActions: ['NetworkController:getSelectedNetworkClient'],
    allowedEvents: [],
  });
}
