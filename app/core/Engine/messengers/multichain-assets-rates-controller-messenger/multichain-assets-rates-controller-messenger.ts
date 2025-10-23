import { RootExtendedMessenger } from '../../types';
import { MultichainAssetsRatesControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainAssetsRatesControllerMessenger for the MultichainAssetsRatesController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The MultichainAssetsRatesControllerMessenger.
 */
export function getMultichainAssetsRatesControllerMessenger(
  baseControllerMessenger: RootExtendedMessenger,
): MultichainAssetsRatesControllerMessenger {
  return baseControllerMessenger.getRestricted({
    name: 'MultichainAssetsRatesController',
    allowedEvents: [
      'AccountsController:accountAdded',
      'KeyringController:lock',
      'KeyringController:unlock',
      'CurrencyRateController:stateChange',
      'MultichainAssetsController:accountAssetListUpdated',
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
