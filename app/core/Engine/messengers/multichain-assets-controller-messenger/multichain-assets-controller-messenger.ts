import { BaseControllerMessenger } from '../../types';
import { MultichainAssetsControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainAssetsControllerMessenger for the MultichainAssetsController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The MultichainAssetsControllerMessenger.
 */
export function getMultichainAssetsControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): MultichainAssetsControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'MultichainAssetsController',
    allowedEvents: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:accountAssetListUpdated',
    ],
    allowedActions: [
      'PermissionController:getPermissions',
      'SnapController:handleRequest',
      'SnapController:getAll',
      'AccountsController:listMultichainAccounts',
    ],
  });
}
