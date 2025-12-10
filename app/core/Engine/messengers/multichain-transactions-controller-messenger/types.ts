import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerAccountRemovedEvent,
  AccountsControllerListMultichainAccountsAction,
  AccountsControllerAccountTransactionsUpdatedEvent,
} from '@metamask/accounts-controller';
import { KeyringControllerGetStateAction } from '@metamask/keyring-controller';
import { Messenger } from '@metamask/messenger';
import {
  MultichainTransactionsControllerGetStateAction,
  MultichainTransactionsControllerStateChange,
  MultichainTransactionsControllerTransactionConfirmedEvent,
  MultichainTransactionsControllerTransactionSubmittedEvent,
} from '@metamask/multichain-transactions-controller';
import { HandleSnapRequest } from '@metamask/snaps-controllers';

export type MultichainTransactionsControllerActions =
  | MultichainTransactionsControllerGetStateAction
  | AccountsControllerListMultichainAccountsAction
  | HandleSnapRequest
  | KeyringControllerGetStateAction;

export type MultichainTransactionsControllerEvents =
  | MultichainTransactionsControllerStateChange
  | MultichainTransactionsControllerTransactionConfirmedEvent
  | MultichainTransactionsControllerTransactionSubmittedEvent
  | AccountsControllerAccountAddedEvent
  | AccountsControllerAccountRemovedEvent
  | AccountsControllerAccountTransactionsUpdatedEvent;

// TODO: remove once the messenger is exported from the package
export type MultichainTransactionsControllerMessenger = Messenger<
  'MultichainTransactionsController',
  MultichainTransactionsControllerActions,
  MultichainTransactionsControllerEvents
>;
