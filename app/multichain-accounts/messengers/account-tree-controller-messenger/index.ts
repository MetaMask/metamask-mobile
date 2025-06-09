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
      'AccountsController:stateChange',
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'KeyringController:stateChange',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'AccountsController:listAccounts',
      'SnapController:get',
      'KeyringController:getState',
      'KeyringController:getAccounts',
    ],
  });
}
