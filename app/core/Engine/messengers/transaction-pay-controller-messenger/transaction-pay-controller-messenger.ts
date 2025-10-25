import { Messenger } from '@metamask/base-controller';
import {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
} from '@metamask/network-controller';
import {
  TransactionControllerStateChangeEvent,
  TransactionControllerUnapprovedTransactionAddedEvent,
  TransactionControllerGetStateAction,
  TransactionControllerUpdateTransactionAction,
} from '@metamask/transaction-controller';
import {
  BridgeStatusControllerActions,
  BridgeStatusControllerStateChangeEvent,
} from '@metamask/bridge-status-controller';
import { TransactionPayControllerMessenger } from '@metamask/transaction-pay-controller';
import { BridgeControllerActions } from '@metamask/bridge-controller';
import {
  AccountTrackerControllerGetStateAction,
  CurrencyRateControllerActions,
  TokenBalancesControllerGetStateAction,
  TokenListControllerActions,
  TokenRatesControllerGetStateAction,
  TokensControllerGetStateAction,
} from '@metamask/assets-controllers';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { GasFeeControllerActions } from '@metamask/gas-fee-controller';

type MessengerActions =
  | AccountTrackerControllerGetStateAction
  | BridgeControllerActions
  | BridgeStatusControllerActions
  | CurrencyRateControllerActions
  | GasFeeControllerActions
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | NetworkControllerGetNetworkClientByIdAction
  | RemoteFeatureFlagControllerGetStateAction
  | TokenBalancesControllerGetStateAction
  | TokenListControllerActions
  | TokenRatesControllerGetStateAction
  | TokensControllerGetStateAction
  | TransactionControllerGetStateAction
  | TransactionControllerUpdateTransactionAction;

type MessengerEvents =
  | BridgeStatusControllerStateChangeEvent
  | TransactionControllerStateChangeEvent
  | TransactionControllerUnapprovedTransactionAddedEvent;

export function getTransactionPayControllerMessenger(
  messenger: Messenger<MessengerActions, MessengerEvents>,
): TransactionPayControllerMessenger {
  return messenger.getRestricted({
    name: 'TransactionPayController',
    allowedActions: [
      'AccountTrackerController:getState',
      'BridgeController:fetchQuotes',
      'BridgeStatusController:submitTx',
      'CurrencyRateController:getState',
      'GasFeeController:getState',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
      'RemoteFeatureFlagController:getState',
      'TokenBalancesController:getState',
      'TokenListController:getState',
      'TokenRatesController:getState',
      'TokensController:getState',
      'TransactionController:getState',
      'TransactionController:updateTransaction',
    ],
    allowedEvents: [
      'BridgeStatusController:stateChange',
      'TransactionController:stateChange',
      'TransactionController:unapprovedTransactionAdded',
    ],
  });
}
