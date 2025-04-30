import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerAccountRemovedEvent,
  AccountsControllerListMultichainAccountsAction,
  AccountsControllerAccountTransactionsUpdatedEvent,
} from '@metamask/accounts-controller';
import { HandleSnapRequest } from '@metamask/snaps-controllers';
import { Transaction } from '@metamask/keyring-api';
export type MultichainTransactionsControllerActions =
  | AccountsControllerListMultichainAccountsAction
  | HandleSnapRequest;

export type MultichainTransactionsControllerEvents =
  | AccountsControllerAccountAddedEvent
  | AccountsControllerAccountRemovedEvent
  | AccountsControllerAccountTransactionsUpdatedEvent
  | {
      type: 'MultichainTransactionsController:stateChange';
      payload: [unknown];
    }
  | {
      type: 'MultichainTransactionsController:transactionConfirmed';
      payload: [Transaction];
    }
  | {
      type: 'MultichainTransactionsController:transactionSubmitted';
      payload: [Transaction];
    };