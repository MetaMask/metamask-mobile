import { RootExtendedMessenger } from '../../types';
import { MultichainNetworkControllerMessenger } from '@metamask/multichain-network-controller';

/**
 * Get the MultichainNetworkControllerMessenger for the MultichainNetworkController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The MultichainNetworkControllerMessenger.
 */
export function getMultichainNetworkControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): MultichainNetworkControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'MultichainNetworkController',
    allowedActions: [
      'NetworkController:setActiveNetwork',
      'NetworkController:getState',
      'AccountsController:listMultichainAccounts',
    ],
    allowedEvents: ['AccountsController:selectedAccountChange'],
  });
}
