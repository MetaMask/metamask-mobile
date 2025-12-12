import {
  AccountsControllerGetSelectedAccountAction,
  AccountsControllerGetStateAction,
} from '@metamask/accounts-controller';
import { ApprovalControllerActions } from '@metamask/approval-controller';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetEIP1559CompatibilityAction,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import {
  TransactionControllerAddTransactionAction,
  TransactionControllerAddTransactionBatchAction,
  TransactionControllerGetStateAction,
  TransactionControllerMessenger,
  TransactionControllerStateChangeEvent,
  TransactionControllerTransactionApprovedEvent,
  TransactionControllerTransactionConfirmedEvent,
  TransactionControllerTransactionDroppedEvent,
  TransactionControllerTransactionFailedEvent,
  TransactionControllerTransactionRejectedEvent,
  TransactionControllerTransactionSubmittedEvent,
  TransactionControllerUnapprovedTransactionAddedEvent,
  TransactionControllerUpdateTransactionAction,
} from '@metamask/transaction-controller';
import {
  SmartTransactionsControllerSmartTransactionEvent,
  SmartTransactionsControllerSmartTransactionConfirmationDoneEvent,
} from '@metamask/smart-transactions-controller';
import {
  KeyringControllerSignEip7702AuthorizationAction,
  KeyringControllerSignTypedMessageAction,
} from '@metamask/keyring-controller';
import {
  BridgeStatusControllerActions,
  BridgeStatusControllerEvents,
} from '@metamask/bridge-status-controller';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import {
  AccountTrackerControllerGetStateAction,
  CurrencyRateControllerActions,
} from '@metamask/assets-controllers';
import {
  TransactionPayControllerGetStateAction,
  TransactionPayControllerGetStrategyAction,
} from '@metamask/transaction-pay-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

export function getTransactionControllerMessenger(
  rootMessenger: RootMessenger,
): TransactionControllerMessenger {
  const messenger = new Messenger<
    'TransactionController',
    MessengerActions<TransactionControllerMessenger>,
    MessengerEvents<TransactionControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TransactionController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getSelectedAccount',
      'AccountsController:getState',
      `ApprovalController:addRequest`,
      'KeyringController:signEip7702Authorization',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
      'RemoteFeatureFlagController:getState',
    ],
    events: [`NetworkController:stateChange`],
    messenger,
  });
  return messenger;
}

type InitMessengerActions =
  | AccountsControllerGetStateAction
  | AccountsControllerGetSelectedAccountAction
  | AccountTrackerControllerGetStateAction
  | ApprovalControllerActions
  | BridgeStatusControllerActions
  | CurrencyRateControllerActions
  | DelegationControllerSignDelegationAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | KeyringControllerSignEip7702AuthorizationAction
  | KeyringControllerSignTypedMessageAction
  | NetworkControllerGetEIP1559CompatibilityAction
  | NetworkControllerGetNetworkClientByIdAction
  | RemoteFeatureFlagControllerGetStateAction
  | TransactionControllerAddTransactionAction
  | TransactionControllerAddTransactionBatchAction
  | TransactionControllerGetStateAction
  | TransactionControllerUpdateTransactionAction
  | TransactionPayControllerGetStateAction
  | TransactionPayControllerGetStrategyAction;

type InitMessengerEvents =
  | BridgeStatusControllerEvents
  | TransactionControllerStateChangeEvent
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

export function getTransactionControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'TransactionControllerInit',
    InitMessengerActions,
    InitMessengerEvents,
    RootMessenger
  >({
    namespace: 'TransactionControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'AccountTrackerController:getState',
      'ApprovalController:addRequest',
      'ApprovalController:endFlow',
      'ApprovalController:startFlow',
      'ApprovalController:updateRequestState',
      'BridgeStatusController:getState',
      'BridgeStatusController:submitTx',
      'CurrencyRateController:getState',
      'DelegationController:signDelegation',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getEIP1559Compatibility',
      'KeyringController:signEip7702Authorization',
      'KeyringController:signTypedMessage',
      'RemoteFeatureFlagController:getState',
      'TransactionController:addTransaction',
      'TransactionController:addTransactionBatch',
      'TransactionController:getState',
      'TransactionController:updateTransaction',
      'TransactionPayController:getState',
      'TransactionPayController:getStrategy',
    ],
    events: [
      'BridgeStatusController:stateChange',
      'TransactionController:stateChange',
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
    messenger,
  });

  return messenger;
}
