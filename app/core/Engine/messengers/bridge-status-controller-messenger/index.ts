import { BridgeStatusControllerMessenger } from '@metamask/bridge-status-controller';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the BridgeControllerMessenger for the BridgeController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The BridgeControllerMessenger.
 */
export function getBridgeStatusControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<BridgeStatusControllerMessenger>,
    MessengerEvents<BridgeStatusControllerMessenger>
  >,
): BridgeStatusControllerMessenger {
  const messenger: BridgeStatusControllerMessenger = new Messenger({
    namespace: 'BridgeStatusController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'AccountsController:getAccountByAddress',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getState',
      'KeyringController:signTypedMessage',
      'BridgeController:getState',
      'BridgeController:stopPollingForQuotes',
      'BridgeController:trackUnifiedSwapBridgeEvent',
      'SnapController:handleRequest',
      'TransactionController:getState',
      'AuthenticationController:getBearerToken',
      'RemoteFeatureFlagController:getState',
      'TransactionController:addTransaction',
      'TransactionController:updateTransaction',
      'TransactionController:estimateGasFee',
      'TransactionController:isAtomicBatchSupported',
    ],
    events: ['TransactionController:transactionStatusUpdated'],
    messenger,
  });
  return messenger;
}
