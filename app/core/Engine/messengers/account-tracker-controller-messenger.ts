import { Messenger } from '@metamask/base-controller';
import type {
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerListAccountsAction,
  AccountsControllerSelectedEvmAccountChangeEvent,
} from '@metamask/accounts-controller';
import type { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import type {
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetStateAction,
  NetworkControllerNetworkAddedEvent,
} from '@metamask/network-controller';
import {
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerUnapprovedTransactionAddedEvent,
} from '@metamask/transaction-controller';
import { KeyringControllerUnlockEvent } from '@metamask/keyring-controller';

type AllowedActions =
  | AccountsControllerListAccountsAction
  | PreferencesControllerGetStateAction
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerGetStateAction
  | NetworkControllerGetNetworkClientByIdAction;

type AllowedEvents =
  | AccountsControllerSelectedEvmAccountChangeEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerUnapprovedTransactionAddedEvent
  | NetworkControllerNetworkAddedEvent
  | KeyringControllerUnlockEvent;

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
      'TransactionController:transactionConfirmed',
      'TransactionController:unapprovedTransactionAdded',
      'NetworkController:networkAdded',
      'KeyringController:unlock',
    ],
  });
}
