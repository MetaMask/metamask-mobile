import { BridgeControllerMessenger } from '@metamask/bridge-controller';
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
export function getBridgeControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): BridgeControllerMessenger {
  const messenger = new Messenger<
    'BridgeController',
    MessengerActions<BridgeControllerMessenger>,
    MessengerEvents<BridgeControllerMessenger>,
    RootMessenger
  >({
    namespace: 'BridgeController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:getAccountByAddress',
      'SnapController:handleRequest',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'TokenRatesController:getState',
      'MultichainAssetsRatesController:getState',
      'CurrencyRateController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    events: [],
    messenger,
  });
  return messenger;
}
