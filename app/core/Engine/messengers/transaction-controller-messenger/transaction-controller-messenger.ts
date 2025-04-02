import { TransactionControllerMessenger } from '@metamask/transaction-controller';
import { BaseControllerMessenger } from '../../types';

export type TransactionControllerInitMessenger = ReturnType<
  typeof getTransactionControllerInitMessenger
>;

export function getTransactionControllerMessenger(
  messenger: BaseControllerMessenger,
): TransactionControllerMessenger {
  return messenger.getRestricted({
    name: 'TransactionController',
    allowedActions: [
      'AccountsController:getSelectedAccount',
      'AccountsController:getState',
      `ApprovalController:addRequest`,
      'KeyringController:signEip7702Authorization',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
    ],
    allowedEvents: [`NetworkController:stateChange`],
  });
}

export function getTransactionControllerInitMessenger(
  messenger: BaseControllerMessenger,
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
