import { Messenger } from '@metamask/base-controller';
import type {
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerListAccountsAction,
  AccountsControllerSelectedAccountChangeEvent,
  AccountsControllerSelectedEvmAccountChangeEvent,
} from '@metamask/accounts-controller';
import type { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import type {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
} from '@metamask/network-controller';
import {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerUnapprovedTransactionAddedEvent,
} from '@metamask/transaction-controller';

type AllowedActions =
  | AccountsControllerListAccountsAction
  | PreferencesControllerGetStateAction
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerGetStateAction
  | NetworkControllerGetNetworkClientByIdAction;

type AllowedEvents =
  | AccountsControllerSelectedEvmAccountChangeEvent
  | AccountsControllerSelectedAccountChangeEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerUnapprovedTransactionAddedEvent;

export type AccountTrackerControllerMessenger = ReturnType<
  typeof getAccountTrackerControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * account tracker controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getAccountTrackerControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'AccountTrackerController',
    allowedActions: [
      'AccountsController:getSelectedAccount',
      'AccountsController:listAccounts',
      'PreferencesController:getState',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
    ],
    allowedEvents: [
      'AccountsController:selectedEvmAccountChange',
      'AccountsController:selectedAccountChange',
      'TransactionController:transactionConfirmed',
      'TransactionController:unapprovedTransactionAdded',
    ],
  });
}
