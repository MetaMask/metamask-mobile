import { Messenger } from '@metamask/base-controller';
import {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
} from '@metamask/network-controller';
import {
  TransactionControllerStateChangeEvent,
  TransactionControllerUnapprovedTransactionAddedEvent,
  TransactionControllerGetStateAction,
} from '@metamask/transaction-controller';
import {
  BridgeStatusControllerActions,
  BridgeStatusControllerStateChangeEvent,
} from '@metamask/bridge-status-controller';
import { TransactionPayControllerMessenger } from '@metamask/transaction-pay-controller';
import { BridgeControllerActions } from '@metamask/bridge-controller';
import {
  CurrencyRateControllerActions,
  TokenBalancesControllerGetStateAction,
  TokenListControllerActions,
  TokenRatesControllerGetStateAction,
  TokensControllerGetStateAction,
} from '@metamask/assets-controllers';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';

type MessengerActions =
  | BridgeControllerActions
  | BridgeStatusControllerActions
  | CurrencyRateControllerActions
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | NetworkControllerGetNetworkClientByIdAction
  | RemoteFeatureFlagControllerGetStateAction
  | TokenBalancesControllerGetStateAction
  | TokenListControllerActions
  | TokenRatesControllerGetStateAction
  | TokensControllerGetStateAction
  | TransactionControllerGetStateAction;

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
      'BridgeController:fetchQuotes',
      'BridgeStatusController:submitTx',
      'CurrencyRateController:getState',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
      'RemoteFeatureFlagController:getState',
      'TokenBalancesController:getState',
      'TokenListController:getState',
      'TokenRatesController:getState',
      'TokensController:getState',
      'TransactionController:getState',
    ],
    allowedEvents: [
      'BridgeStatusController:stateChange',
      'TransactionController:stateChange',
      'TransactionController:unapprovedTransactionAdded',
    ],
  });
}
