import { TransactionPayControllerMessenger } from '@metamask/transaction-pay-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { DelegationControllerSignDelegationAction } from '@metamask/delegation-controller';
import {
  KeyringControllerSignEip7702AuthorizationAction,
  KeyringControllerSignPersonalMessageAction,
  KeyringControllerSignTypedMessageAction,
} from '@metamask/keyring-controller';
import { TransactionControllerIsAtomicBatchSupportedAction } from '@metamask/transaction-controller';
import { NetworkControllerGetNetworkConfigurationByChainIdAction } from '@metamask/network-controller';

export function getTransactionPayControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<TransactionPayControllerMessenger>,
    MessengerEvents<TransactionPayControllerMessenger>
  >,
): TransactionPayControllerMessenger {
  const messenger: TransactionPayControllerMessenger = new Messenger({
    namespace: 'TransactionPayController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'AccountTrackerController:getState',
      'AssetsController:getStateForTransactionPay',
      'CurrencyRateController:getState',
      'GasFeeController:getState',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getNetworkClientById',
      'NetworkController:getNetworkConfigurationByChainId',
      'RampsController:getOrder',
      'RampsController:getQuotes',
      'RemoteFeatureFlagController:getState',
      'TokenBalancesController:getState',
      'TokenRatesController:getState',
      'TokensController:getState',
      'TransactionController:beginAtomicBatchUpdate',
      'TransactionController:estimateGas',
      'TransactionController:estimateGasBatch',
      'TransactionController:getGasFeeTokens',
      'TransactionController:getState',
      'TransactionController:updateTransaction',
      'KeyringController:getState',
      'KeyringController:signTypedMessage',
    ],
    events: [
      'TransactionController:stateChange',
      'TransactionController:unapprovedTransactionAdded',
    ],
    messenger,
  });

  return messenger;
}

type InitMessengerActions =
  | DelegationControllerSignDelegationAction
  | KeyringControllerSignEip7702AuthorizationAction
  | KeyringControllerSignPersonalMessageAction
  | KeyringControllerSignTypedMessageAction
  | NetworkControllerGetNetworkConfigurationByChainIdAction
  | TransactionControllerIsAtomicBatchSupportedAction;

type InitMessengerEvents = never;

export type TransactionPayControllerInitMessenger = Messenger<
  'TransactionPayControllerInit',
  InitMessengerActions,
  InitMessengerEvents
>;

export function getTransactionPayControllerInitMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<TransactionPayControllerInitMessenger>,
    MessengerEvents<TransactionPayControllerInitMessenger>
  >,
): TransactionPayControllerInitMessenger {
  const messenger: TransactionPayControllerInitMessenger = new Messenger({
    namespace: 'TransactionPayControllerInit',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'DelegationController:signDelegation',
      'KeyringController:signEip7702Authorization',
      'KeyringController:signPersonalMessage',
      'KeyringController:signTypedMessage',
      'NetworkController:getNetworkConfigurationByChainId',
      'TransactionController:isAtomicBatchSupported',
    ],
    events: [],
    messenger,
  });

  return messenger;
}
