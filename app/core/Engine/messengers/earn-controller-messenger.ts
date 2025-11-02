import { Messenger } from '@metamask/base-controller';
import {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
  NetworkControllerNetworkDidChangeEvent,
} from '@metamask/network-controller';
import {
  AccountTreeControllerGetAccountsFromSelectedAccountGroupAction,
  AccountTreeControllerSelectedAccountGroupChangeEvent,
} from '@metamask/account-tree-controller';
import { TransactionControllerTransactionConfirmedEvent } from '@metamask/transaction-controller';

type AllowedActions =
  | NetworkControllerGetNetworkClientByIdAction
  | AccountTreeControllerGetAccountsFromSelectedAccountGroupAction;

type AllowedEvents =
  | AccountTreeControllerSelectedAccountGroupChangeEvent
  | TransactionControllerTransactionConfirmedEvent
  | NetworkControllerNetworkDidChangeEvent;

export type EarnControllerMessenger = ReturnType<
  typeof getEarnControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * earn controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getEarnControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'EarnController',
    allowedActions: [
      'NetworkController:getNetworkClientById',
      'AccountTreeController:getAccountsFromSelectedAccountGroup',
    ],
    allowedEvents: [
      'AccountTreeController:selectedAccountGroupChange',
      'TransactionController:transactionConfirmed',
      'NetworkController:networkDidChange',
    ],
  });
}

type AllowedInitializationActions = NetworkControllerGetStateAction;

export type EarnControllerInitMessenger = ReturnType<
  typeof getEarnControllerInitMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * earn controller initialization is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getEarnControllerInitMessenger(
  messenger: Messenger<AllowedInitializationActions, never>,
) {
  return messenger.getRestricted({
    name: 'EarnControllerInitialization',
    allowedActions: ['NetworkController:getState'],
    allowedEvents: [],
  });
}
