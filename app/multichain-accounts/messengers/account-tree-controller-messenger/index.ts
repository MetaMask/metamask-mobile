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
      'AccountsController:accountRenamed',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'AccountsController:getAccount',
      'AccountsController:getSelectedMultichainAccount',
      'AccountsController:setSelectedAccount',
      'SnapController:get',
      'KeyringController:getState',
    ],
  });
}
