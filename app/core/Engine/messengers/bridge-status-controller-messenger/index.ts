import { BridgeStatusControllerMessenger } from '@metamask/bridge-status-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the BridgeControllerMessenger for the BridgeController.
 *
 * @param rootExtendedMessenger - The base controller messenger.
 * @returns The BridgeControllerMessenger.
 */
export function getBridgeStatusControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): BridgeStatusControllerMessenger {
  const messenger = new Messenger<
    'BridgeStatusController',
    MessengerActions<BridgeStatusControllerMessenger>,
    MessengerEvents<BridgeStatusControllerMessenger>,
    RootMessenger
  >({
    namespace: 'BridgeStatusController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:getAccountByAddress',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getState',
      'BridgeController:stopPollingForQuotes',
      'BridgeController:trackUnifiedSwapBridgeEvent',
      'GasFeeController:getState',
      'SnapController:handleRequest',
      'TransactionController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    events: [
      'TransactionController:transactionConfirmed',
      'TransactionController:transactionFailed',
    ],
    messenger,
  });
  return messenger;
}
