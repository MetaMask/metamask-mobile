import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import { MultichainBalancesControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainBalancesControllerMessenger for the MultichainBalancesController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The MultichainBalancesControllerMessenger.
 */
export function getMultichainBalancesControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): MultichainBalancesControllerMessenger {
  const messenger = new Messenger<
    'MultichainBalancesController',
    MessengerActions<MultichainBalancesControllerMessenger>,
    MessengerEvents<MultichainBalancesControllerMessenger>,
    RootMessenger
  >({
    namespace: 'MultichainBalancesController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'AccountsController:listMultichainAccounts',
      'SnapController:handleRequest',
      'MultichainAssetsController:getState',
      'KeyringController:getState',
    ],
    events: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:accountBalancesUpdated',
      'MultichainAssetsController:accountAssetListUpdated',
    ],
    messenger,
  });
  return messenger;
}
