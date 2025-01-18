import { AccountsControllerMessenger } from '@metamask/accounts-controller';
import { ControllerMessenger } from '../../types';

export function getAccountsControllerMessenger(
  controllerMessenger: ControllerMessenger,
): AccountsControllerMessenger {
  return controllerMessenger.getRestricted({
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
