import { BaseControllerMessenger } from '../../types';
import { MultichainBalancesControllerMessenger } from '@metamask/assets-controllers';

// Export the types
export * from './types';

/**
 * Get the MultichainBalancesControllerMessenger for the MultichainBalancesController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The MultichainBalancesControllerMessenger.
 */
export function getMultichainBalancesControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): MultichainBalancesControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'MultichainBalancesController',
    allowedEvents: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:accountBalancesUpdated',
      'MultichainAssetsController:stateChange',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'MultichainAssetsController:getState',
    ],
  });
}
