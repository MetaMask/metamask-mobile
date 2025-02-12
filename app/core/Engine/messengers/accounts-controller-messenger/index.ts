import { AccountsControllerMessenger } from '@metamask/accounts-controller';
import { BaseControllerMessenger } from '../../types';

// Export the types
export * from './types';

/**
 * Get the AccountsControllerMessenger for the AccountsController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The AccountsControllerMessenger.
 */
export function getAccountsControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): AccountsControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'AccountsController',
    allowedEvents: [
      'SnapController:stateChange',
      'KeyringController:accountRemoved',
      'KeyringController:stateChange',
    ],
    allowedActions: [
      'KeyringController:getAccounts',
      'KeyringController:getKeyringsByType',
      'KeyringController:getKeyringForAccount',
    ],
  });
}
