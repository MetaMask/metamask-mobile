import { BaseControllerMessenger } from '../../../core/Engine/types';

/**
 * Get the AccountTreeControllerMessenger for the AccountTreeController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The AccountTreeControllerMessenger.
 */
export function getAccountTreeControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
) {
  return baseControllerMessenger.getRestricted({
    name: 'AccountTreeController',
    allowedEvents: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:selectedAccountChange',
      'UserStorageController:stateChange',
      'MultichainAccountService:walletStatusChange',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'AccountsController:getAccount',
      'AccountsController:getSelectedMultichainAccount',
      'AccountsController:setSelectedAccount',
      'UserStorageController:getState',
      'UserStorageController:performGetStorage',
      'UserStorageController:performGetStorageAllFeatureEntries',
      'UserStorageController:performSetStorage',
      'UserStorageController:performBatchSetStorage',
      'AuthenticationController:getSessionProfile',
      'MultichainAccountService:createMultichainAccountGroup',
      'SnapController:get',
      'KeyringController:getState',
    ],
  });
}
