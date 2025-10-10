import { Messenger } from '@metamask/base-controller';
import {
  NetworkControllerFindNetworkClientIdByChainIdAction,
  NetworkControllerGetNetworkClientByIdAction,
} from '@metamask/network-controller';
import {
  TransactionControllerStateChangeEvent,
  TransactionControllerUnapprovedTransactionAddedEvent,
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

type MessengerActions =
  | BridgeControllerActions
  | BridgeStatusControllerActions
  | CurrencyRateControllerActions
  | NetworkControllerFindNetworkClientIdByChainIdAction
  | NetworkControllerGetNetworkClientByIdAction
  | TokenBalancesControllerGetStateAction
  | TokenListControllerActions
  | TokenRatesControllerGetStateAction
  | TokensControllerGetStateAction;

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
      'TokenBalancesController:getState',
      'TokenListController:getState',
      'TokenRatesController:getState',
      'TokensController:getState',
    ],
    allowedEvents: [
      'BridgeStatusController:stateChange',
      'TransactionController:stateChange',
      'TransactionController:unapprovedTransactionAdded',
    ],
  });
}
