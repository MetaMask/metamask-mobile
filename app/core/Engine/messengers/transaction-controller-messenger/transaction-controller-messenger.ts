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
  NetworkControllerGetNetworkConfigurationByChainIdAction,
  NetworkControllerStateChangeEvent,
} from '@metamask/network-controller';
import {
  TransactionControllerAddTransactionAction,
  TransactionControllerAddTransactionBatchAction,
  TransactionControllerEstimateGasBatchAction,
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
  SmartTransactionsControllerGetFeesAction,
  SmartTransactionsControllerGetSmartTransactionByMinedTxHashAction,
  SmartTransactionsControllerSetStatusRefreshIntervalAction,
  SmartTransactionsControllerSmartTransactionEvent,
  SmartTransactionsControllerSmartTransactionConfirmationDoneEvent,
  SmartTransactionsControllerSubmitSignedTransactionsAction,
} from '@metamask/smart-transactions-controller';
import {
  KeyringControllerGetKeyringForAccountAction,
  KeyringControllerGetStateAction,
  KeyringControllerSignEip7702AuthorizationAction,
  KeyringControllerSignTypedMessageAction,
  KeyringControllerUnlockEvent,
} from '@metamask/keyring-controller';
import type { PreferencesControllerGetStateAction } from '@metamask/preferences-controller';
import {
  BridgeStatusControllerActions,
  BridgeStatusControllerEvents,
} from '@metamask/bridge-status-controller';
import type { GasFeeControllerFetchGasFeeEstimatesAction } from '@metamask/gas-fee-controller';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import {
  AccountTrackerControllerGetStateAction,
  CurrencyRateControllerActions,
} from '@metamask/assets-controllers';
import { TransactionPayControllerActions } from '@metamask/transaction-pay-controller';
import { RootMessenger } from '../../types';
import { AnalyticsControllerActions } from '@metamask/analytics-controller';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type {
  PredictControllerBeforeSignAction,
  PredictControllerBeforePublishAction,
  PredictControllerPublishAction,
} from '../../../../components/UI/Predict/controllers/PredictController-method-action-types';

export function getTransactionControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<TransactionControllerMessenger>,
    MessengerEvents<TransactionControllerMessenger>
  >,
): TransactionControllerMessenger {
  const messenger: TransactionControllerMessenger = new Messenger({
    namespace: 'TransactionController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getSelectedAccount',
      'AccountsController:getState',
      `ApprovalController:addRequest`,
      'GasFeeController:fetchGasFeeEstimates',
      'KeyringController:getState',
      'KeyringController:signEip7702Authorization',
      'KeyringController:signTransaction',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getEIP1559Compatibility',
      'NetworkController:getNetworkClientById',
      'NetworkController:getNetworkClientRegistry',
      'NetworkController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    events: [
      'AccountActivityService:transactionUpdated',
      'NetworkController:stateChange',
    ],
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
  | GasFeeControllerFetchGasFeeEstimatesAction
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | NetworkControllerGetNetworkClientByIdAction
  | KeyringControllerGetKeyringForAccountAction
  | KeyringControllerGetStateAction
  | KeyringControllerSignEip7702AuthorizationAction
  | KeyringControllerSignTypedMessageAction
  | NetworkControllerGetEIP1559CompatibilityAction
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetNetworkConfigurationByChainIdAction
  | PreferencesControllerGetStateAction
  | RemoteFeatureFlagControllerGetStateAction
  | SmartTransactionsControllerGetFeesAction
  | SmartTransactionsControllerGetSmartTransactionByMinedTxHashAction
  | SmartTransactionsControllerSetStatusRefreshIntervalAction
  | SmartTransactionsControllerSubmitSignedTransactionsAction
  | TransactionControllerAddTransactionAction
  | TransactionControllerAddTransactionBatchAction
  | TransactionControllerEstimateGasBatchAction
  | TransactionControllerGetStateAction
  | TransactionControllerUpdateTransactionAction
  | TransactionPayControllerActions
  | AnalyticsControllerActions
  | PredictControllerBeforePublishAction
  | PredictControllerBeforeSignAction
  | PredictControllerPublishAction;

type InitMessengerEvents =
  | BridgeStatusControllerEvents
  | KeyringControllerUnlockEvent
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

export type TransactionControllerInitMessenger = Messenger<
  'TransactionControllerInit',
  InitMessengerActions,
  InitMessengerEvents
>;

export function getTransactionControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<TransactionControllerInitMessenger>,
    MessengerEvents<TransactionControllerInitMessenger>
  >,
): TransactionControllerInitMessenger {
  const messenger: TransactionControllerInitMessenger = new Messenger({
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
      'GasFeeController:fetchGasFeeEstimates',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getEIP1559Compatibility',
      'NetworkController:getNetworkClientById',
      'NetworkController:getNetworkConfigurationByChainId',
      'KeyringController:getKeyringForAccount',
      'KeyringController:getState',
      'KeyringController:signEip7702Authorization',
      'KeyringController:signTypedMessage',
      'PreferencesController:getState',
      'RemoteFeatureFlagController:getState',
      'SmartTransactionsController:getFees',
      'SmartTransactionsController:getSmartTransactionByMinedTxHash',
      'SmartTransactionsController:setStatusRefreshInterval',
      'SmartTransactionsController:submitSignedTransactions',
      'TransactionController:addTransaction',
      'TransactionController:addTransactionBatch',
      'TransactionController:estimateGasBatch',
      'TransactionController:getState',
      'TransactionController:updateTransaction',
      'TransactionPayController:getAmountData',
      'TransactionPayController:getDelegationTransaction',
      'TransactionPayController:getFiatOptions',
      'TransactionPayController:getPaymentOverrideData',
      'TransactionPayController:getState',
      'TransactionPayController:getStrategy',
      'TransactionPayController:polymarketGetDepositWalletAddress',
      'TransactionPayController:polymarketSubmitDepositWalletBatch',
      'AnalyticsController:trackEvent',
      'PredictController:beforePublish',
      'PredictController:beforeSign',
      'PredictController:publish',
      // Missing actions to use fiat payment hook from publish hook
      // Actions below are provided by patched controllers not yet in upstream types
      // @ts-expect-error See above
      'AssetsController:getStateForTransactionPay',
      // @ts-expect-error See above
      'BridgeController:fetchQuotes',
      // @ts-expect-error See above
      'GasFeeController:getState',
      // @ts-expect-error See above
      'RampsController:getOrder',
      // @ts-expect-error See above
      'RampsController:getQuotes',
      // @ts-expect-error See above
      'RampsController:getState',
      // @ts-expect-error See above
      'TokenBalancesController:getState',
      // @ts-expect-error See above
      'TokenRatesController:getState',
      // @ts-expect-error See above
      'TokensController:getState',
    ],
    events: [
      'BridgeStatusController:stateChange',
      'KeyringController:unlock',
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
