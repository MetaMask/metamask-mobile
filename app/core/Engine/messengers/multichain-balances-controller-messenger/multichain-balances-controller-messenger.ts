import { BaseControllerMessenger } from '../../types';
import { MultichainBalancesControllerMessenger } from '@metamask/assets-controllers';
import { AccountActivityServiceBalanceUpdatedEvent } from '@metamask/backend-platform';

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
      'MultichainAssetsController:accountAssetListUpdated',
      'AccountActivityService:balanceUpdated',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'MultichainAssetsController:getState',
      'KeyringController:getState',
    ],
  });
}
