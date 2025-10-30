import { TransactionPayControllerMessenger } from '@metamask/transaction-pay-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

export function getTransactionPayControllerMessenger(
  rootMessenger: RootMessenger,
): TransactionPayControllerMessenger {
  const messenger = new Messenger<
    'TransactionPayController',
    MessengerActions<TransactionPayControllerMessenger>,
    MessengerEvents<TransactionPayControllerMessenger>,
    RootMessenger
  >({
    namespace: 'TransactionPayController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
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
    events: [
      'BridgeStatusController:stateChange',
      'TransactionController:stateChange',
      'TransactionController:unapprovedTransactionAdded',
    ],
    messenger,
  });

  return messenger;
}
