import {
  AccountsControllerAccountAddedEvent,
  AccountsControllerAccountRemovedEvent,
  AccountsControllerListMultichainAccountsAction,
  AccountsControllerAccountTransactionsUpdatedEvent,
} from '@metamask/accounts-controller';
import { MultichainTransactionsControllerTransactionConfirmedEvent } from '@metamask/multichain-transactions-controller';
import { HandleSnapRequest } from '@metamask/snaps-controllers';

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
  | MultichainTransactionsControllerTransactionConfirmedEvent;
