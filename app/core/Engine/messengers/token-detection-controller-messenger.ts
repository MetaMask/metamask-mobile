import { Messenger } from '@metamask/base-controller';
import {
  type KeyringControllerGetStateAction,
  type KeyringControllerLockEvent,
  type KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type {
  AccountsControllerGetAccountAction,
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerSelectedEvmAccountChangeEvent,
} from '@metamask/accounts-controller';
import type {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetNetworkConfigurationByNetworkClientId,
  NetworkControllerGetStateAction,
  NetworkControllerNetworkDidChangeEvent,
} from '@metamask/network-controller';
import type {
  AssetsContractControllerGetBalancesInSingleCallAction,
  GetTokenListState,
  TokenListStateChange,
  TokensControllerAddDetectedTokensAction,
  TokensControllerAddTokensAction,
  TokensControllerGetStateAction,
} from '@metamask/assets-controllers';
import type {
  PreferencesControllerGetStateAction,
  PreferencesControllerStateChangeEvent,
} from '@metamask/preferences-controller';
import type { TransactionControllerTransactionConfirmedEvent } from '@metamask/transaction-controller';

export type AllowedActions =
  | AccountsControllerGetSelectedAccountAction
  | AccountsControllerGetAccountAction
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetNetworkConfigurationByNetworkClientId
  | NetworkControllerGetStateAction
  | GetTokenListState
  | KeyringControllerGetStateAction
  | PreferencesControllerGetStateAction
  | TokensControllerGetStateAction
  | TokensControllerAddDetectedTokensAction
  | TokensControllerAddTokensAction
  | NetworkControllerFindNetworkClientIdByChainIdAction;

export type AllowedEvents =
  | AccountsControllerSelectedEvmAccountChangeEvent
  | NetworkControllerNetworkDidChangeEvent
  | TokenListStateChange
  | KeyringControllerLockEvent
  | KeyringControllerUnlockEvent
  | PreferencesControllerStateChangeEvent
  | TransactionControllerTransactionConfirmedEvent;

export type TokenDetectionControllerMessenger = ReturnType<
  typeof getTokenDetectionControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * token detection controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokenDetectionControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'TokenDetectionController',
    allowedActions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:getNetworkClientById',
      'NetworkController:getNetworkConfigurationByNetworkClientId',
      'NetworkController:getState',
      'KeyringController:getState',
      'PreferencesController:getState',
      'TokenListController:getState',
      'TokensController:getState',
      'TokensController:addDetectedTokens',
      'AccountsController:getAccount',
      'TokensController:addTokens',
      'NetworkController:findNetworkClientIdByChainId',
    ],
    allowedEvents: [
      'KeyringController:lock',
      'KeyringController:unlock',
      'PreferencesController:stateChange',
      'NetworkController:networkDidChange',
      'TokenListController:stateChange',
      'AccountsController:selectedEvmAccountChange',
      'TransactionController:transactionConfirmed',
    ],
  });
}

type AllowedInitializationActions =
  AssetsContractControllerGetBalancesInSingleCallAction;

type AllowedInitializationEvents = never;

export type TokenDetectionControllerInitMessenger = ReturnType<
  typeof getTokenDetectionControllerInitMessenger
>;

/**
 * Get a messenger restricted to the initialization actions that the
 * token detection controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getTokenDetectionControllerInitMessenger(
  messenger: Messenger<
    AllowedInitializationActions,
    AllowedInitializationEvents
  >,
) {
  return messenger.getRestricted({
    name: 'TokenDetectionControllerInit',
    allowedActions: ['AssetsContractController:getBalancesInSingleCall'],
    allowedEvents: [],
  });
}
