import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import { MultichainAssetsRatesControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainAssetsRatesControllerMessenger for the MultichainAssetsRatesController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The MultichainAssetsRatesControllerMessenger.
 */
export function getMultichainAssetsRatesControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): MultichainAssetsRatesControllerMessenger {
  const messenger = new Messenger<
    'MultichainAssetsRatesController',
    MessengerActions<MultichainAssetsRatesControllerMessenger>,
    MessengerEvents<MultichainAssetsRatesControllerMessenger>,
    RootMessenger
  >({
    namespace: 'MultichainAssetsRatesController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'CurrencyRateController:getState',
      'MultichainAssetsController:getState',
      'AccountsController:getSelectedMultichainAccount',
    ],
    events: [
      'AccountsController:accountAdded',
      'KeyringController:lock',
      'KeyringController:unlock',
      'CurrencyRateController:stateChange',
      'MultichainAssetsController:accountAssetListUpdated',
    ],
    messenger,
  });
  return messenger;
}
