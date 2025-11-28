import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import { MultichainAssetsControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainAssetsControllerMessenger for the MultichainAssetsController.
 *
 * @param baseControllerMessenger - The base controller messenger.
 * @returns The MultichainAssetsControllerMessenger.
 */
export function getMultichainAssetsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): MultichainAssetsControllerMessenger {
  const messenger = new Messenger<
    'MultichainAssetsController',
    MessengerActions<MultichainAssetsControllerMessenger>,
    MessengerEvents<MultichainAssetsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'MultichainAssetsController',
    parent: rootExtendedMessenger,
  });
  rootExtendedMessenger.delegate({
    actions: [
      'PermissionController:getPermissions',
      'SnapController:handleRequest',
      'SnapController:getAll',
      'AccountsController:listMultichainAccounts',
    ],
    events: [
      'AccountsController:accountAdded',
      'AccountsController:accountRemoved',
      'AccountsController:accountAssetListUpdated',
    ],
    messenger,
  });
  return messenger;
}
