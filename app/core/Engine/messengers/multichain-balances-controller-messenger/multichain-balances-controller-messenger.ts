import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';
import { MultichainBalancesControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainBalancesControllerMessenger for the MultichainBalancesController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainBalancesControllerMessenger.
 */
export function getMultichainBalancesControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MultichainBalancesControllerMessenger>,
    MessengerEvents<MultichainBalancesControllerMessenger>
  >,
): MultichainBalancesControllerMessenger {
  const messenger: MultichainBalancesControllerMessenger = new Messenger({
    namespace: 'MultichainBalancesController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
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
