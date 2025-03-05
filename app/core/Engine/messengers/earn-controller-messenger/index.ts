import { EarnControllerMessenger } from '@metamask/earn-controller';
import { BaseControllerMessenger } from '../../types';

/**
 * Get the EarnControllerMessenger for the EarnController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The EarnControllerMessenger.
 */
export function getEarnControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): EarnControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'EarnController',
    allowedEvents: [
      'AccountsController:selectedAccountChange',
      'NetworkController:stateChange',
    ],
    allowedActions: [
      'AccountsController:getSelectedAccount',
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
    ],
  });
}
