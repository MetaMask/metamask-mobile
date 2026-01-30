import { TransactionPayControllerMessenger } from '@metamask/transaction-pay-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import { KeyringControllerSignEip7702AuthorizationAction } from '@metamask/keyring-controller';

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
      'TokenRatesController:getState',
      'TokensController:getState',
      'TransactionController:estimateGas',
      'TransactionController:estimateGasBatch',
      'TransactionController:getGasFeeTokens',
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

type InitMessengerActions =
  | DelegationControllerSignDelegationAction
  | KeyringControllerSignEip7702AuthorizationAction;
type InitMessengerEvents = never;

export type TransactionPayControllerInitMessenger = ReturnType<
  typeof getTransactionPayControllerInitMessenger
>;

export function getTransactionPayControllerInitMessenger(
  rootMessenger: RootMessenger,
) {
  const messenger = new Messenger<
    'TransactionPayControllerInit',
    InitMessengerActions,
    InitMessengerEvents,
    RootMessenger
  >({
    namespace: 'TransactionPayControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'DelegationController:signDelegation',
      'KeyringController:signEip7702Authorization',
    ],
    events: [],
    messenger,
  });

  return messenger;
}
