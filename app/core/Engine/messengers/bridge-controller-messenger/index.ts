import { BridgeControllerMessenger } from '@metamask/bridge-controller';
import { RootExtendedMessenger } from '../../types';

/**
 * Get the BridgeControllerMessenger for the BridgeController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The BridgeControllerMessenger.
 */
export function getBridgeControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): BridgeControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'BridgeController',
    allowedActions: [
      'AccountsController:getAccountByAddress',
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
