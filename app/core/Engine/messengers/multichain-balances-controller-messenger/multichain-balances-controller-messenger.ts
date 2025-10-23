import { RootExtendedMessenger } from '../../types';
import { MultichainBalancesControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainBalancesControllerMessenger for the MultichainBalancesController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The MultichainBalancesControllerMessenger.
 */
export function getMultichainBalancesControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): MultichainBalancesControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'MultichainBalancesController',
    allowedEvents: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:accountBalancesUpdated',
      'MultichainAssetsController:accountAssetListUpdated',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'MultichainAssetsController:getState',
      'KeyringController:getState',
    ],
  });
}
