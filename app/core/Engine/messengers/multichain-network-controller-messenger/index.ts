import { BaseControllerMessenger } from '../../types';
import { MultichainNetworkControllerMessenger } from '@metamask/multichain-network-controller';

// Export the types
export * from './types';

/**
 * Get the MultichainNetworkControllerMessenger for the MultichainNetworkController.
 *
 * @param baseControllerMessenger - The base controller messenger.
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
