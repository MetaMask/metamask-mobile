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
      'AccountsController:getSelectedAccount',
      'NetworkController:findNetworkClientIdByChainId',
      'NetworkController:getState',
      'NetworkController:getNetworkClientById',
    ],
    allowedEvents: [],
  });
}
