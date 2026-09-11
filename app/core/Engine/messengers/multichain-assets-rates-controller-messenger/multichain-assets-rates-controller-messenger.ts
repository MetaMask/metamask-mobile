import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';
import { MultichainAssetsRatesControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainAssetsRatesControllerMessenger for the MultichainAssetsRatesController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainAssetsRatesControllerMessenger.
 */
export function getMultichainAssetsRatesControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MultichainAssetsRatesControllerMessenger>,
    MessengerEvents<MultichainAssetsRatesControllerMessenger>
  >,
): MultichainAssetsRatesControllerMessenger {
  const messenger: MultichainAssetsRatesControllerMessenger = new Messenger({
    namespace: 'MultichainAssetsRatesController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
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
