import { BridgeControllerMessenger } from '@metamask/bridge-controller';
import { BaseControllerMessenger } from '../../types';

/**
 * Get the BridgeControllerMessenger for the BridgeController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The BridgeControllerMessenger.
 */
export function getBridgeControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): BridgeControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'BridgeController',
    allowedActions: [
      'AccountsController:getSelectedMultichainAccount',
      'SnapController:handleRequest',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
      'NetworkController:findNetworkClientIdByChainId',
      'TokenRatesController:getState',
      'MultichainAssetsRatesController:getState',
      'CurrencyRateController:getState',
      'RemoteFeatureFlagController:getState',
    ],
    allowedEvents: [],
  });
}
