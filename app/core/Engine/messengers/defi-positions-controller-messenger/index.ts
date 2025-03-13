import { DeFiPositionsControllerMessenger } from '@metamask/assets-controllers';
import { BaseControllerMessenger } from '../../types';

/**
 * Get the DeFiPositionsControllerMessenger for the DeFiPositionsController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The DeFiPositionsControllerMessenger.
 */
export function getDeFiPositionsControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): DeFiPositionsControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'DeFiPositionsController',
    allowedActions: ['AccountsController:getSelectedAccount'],
    allowedEvents: [
      'AccountsController:selectedAccountChange',
      'NetworkController:stateChange',
    ],
  });
}
