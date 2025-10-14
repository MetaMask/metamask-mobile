import { AccountTreeControllerSelectedAccountGroupChangeEvent } from '@metamask/account-tree-controller';
import { BaseControllerMessenger } from '../../../core/Engine/types';
import { Messenger } from '@metamask/base-controller';

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

export type AllowedInitializationEvents =
  AccountTreeControllerSelectedAccountGroupChangeEvent;

export type AccountTreeControllerInitMessenger = ReturnType<
  typeof getAccountTreeControllerInitMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * AccountTreeController requires during initialization.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getAccountTreeControllerInitMessenger(
  messenger: Messenger<never, AllowedInitializationEvents>,
) {
  return messenger.getRestricted({
    name: 'AccountTreeControllerInit',
    allowedActions: [],
    allowedEvents: ['AccountTreeController:selectedAccountGroupChange'],
  });
}
