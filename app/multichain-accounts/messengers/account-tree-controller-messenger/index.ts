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
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:get',
      'KeyringController:getState',
    ],
  });
}
