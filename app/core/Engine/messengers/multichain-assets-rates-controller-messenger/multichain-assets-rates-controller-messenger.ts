import { BaseControllerMessenger } from '../../types';
import { MultichainAssetsRatesControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainAssetsRatesControllerMessenger for the MultichainAssetsRatesController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The MultichainAssetsRatesControllerMessenger.
 */
export function getMultichainAssetsRatesControllerMessenger(
  baseControllerMessenger: BaseControllerMessenger,
): MultichainAssetsRatesControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'MultichainAssetsRatesController',
    allowedEvents: [
      'AccountsController:accountAdded',
      'KeyringController:lock',
      'KeyringController:unlock',
      'CurrencyRateController:stateChange',
      'MultichainAssetsController:stateChange',
    ],
    allowedActions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'CurrencyRateController:getState',
      'MultichainAssetsController:getState',
      'AccountsController:getSelectedMultichainAccount',
    ],
  });
}
