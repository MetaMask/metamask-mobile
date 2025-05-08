import { BaseControllerMessenger } from '../../types';
import { MultichainNetworkControllerMessenger } from '@metamask/multichain-network-controller';

/**
 * Get the MultichainNetworkControllerMessenger for the MultichainNetworkController.
 *
 * @param baseControllerMessenger - The base controllyer messenger.
 * @returns The MultichainNetworkControllerMessenger.
 */
export function getMultichainNetworkControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): MultichainNetworkControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'MultichainNetworkController',
    allowedActions: [
      'NetworkController:setActiveNetwork',
      'NetworkController:getState',
    ],
    allowedEvents: ['AccountsController:selectedAccountChange'],
  });
}
