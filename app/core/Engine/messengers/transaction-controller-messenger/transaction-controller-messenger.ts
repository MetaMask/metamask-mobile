import { AccountsControllerGetSelectedAccountAction } from '@metamask/accounts-controller';
import { ApprovalControllerActions } from '@metamask/approval-controller';
import { Messenger } from '@metamask/base-controller';
import {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetEIP1559CompatibilityAction,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import {
  TransactionControllerMessenger,
  TransactionControllerTransactionApprovedEvent,
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionDroppedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionRejectedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionControllerUnapprovedTransactionAddedEvent,
} from '@metamask/transaction-controller';
import {
  SmartTransactionsControllerSmartTransactionEvent,
  SmartTransactionsControllerSmartTransactionConfirmationDoneEvent,
} from '@metamask/smart-transactions-controller';

type MessengerActions =
  | ApprovalControllerActions
  | AccountsControllerGetSelectedAccountAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | NetworkControllerGetEIP1559CompatibilityAction
  | NetworkControllerGetNetworkClientByIdAction;

type MessengerEvents =
  | TransactionControllerTransactionApprovedEvent
  | TransactionControllerTransactionConfirmedEvent
  | TransactionControllerTransactionDroppedEvent
  | TransactionControllerTransactionFailedEvent
  | TransactionControllerTransactionRejectedEvent
  | TransactionControllerTransactionSubmittedEvent
  | TransactionControllerUnapprovedTransactionAddedEvent
  | NetworkControllerStateChangeEvent
  | SmartTransactionsControllerSmartTransactionEvent
  | SmartTransactionsControllerSmartTransactionConfirmationDoneEvent;

export type TransactionControllerInitMessenger = ReturnType<
  typeof getTransactionControllerInitMessenger
>;

export function getTransactionControllerMessenger(
  messenger: Messenger<MessengerActions, MessengerEvents>,
): TransactionControllerMessenger {
  // @ts-expect-error TODO: Resolve mismatch between base-controller versions.
  return messenger.getRestricted({
    name: 'TransactionController',
    allowedActions: [
      'AccountsController:getSelectedAccount',
      `ApprovalController:addRequest`,
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
    ],
    allowedEvents: [`NetworkController:stateChange`],
  });
}

export function getTransactionControllerInitMessenger(
  messenger: Messenger<MessengerActions, MessengerEvents>,
) {
  return messenger.getRestricted({
    name: 'TransactionControllerInit',
    allowedEvents: [
      'TransactionController:transactionApproved',
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionDropped',
      'TransactionController:transactionFailed',
      'TransactionController:transactionRejected',
      'TransactionController:transactionSubmitted',
      'TransactionController:unapprovedTransactionAdded',
      'SmartTransactionsController:smartTransaction',
      'SmartTransactionsController:smartTransactionConfirmationDone',
    ],
    allowedActions: [
      'ApprovalController:addRequest',
      'ApprovalController:endFlow',
      'ApprovalController:startFlow',
      'ApprovalController:updateRequestState',
      'NetworkController:getEIP1559Compatibility',
    ],
  });
}
