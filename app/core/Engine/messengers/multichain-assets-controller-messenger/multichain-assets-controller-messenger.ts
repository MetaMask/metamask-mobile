import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { RootMessenger } from '../../types';
import { MultichainAssetsControllerMessenger } from '@metamask/assets-controllers';

/**
 * Get the MultichainAssetsControllerMessenger for the MultichainAssetsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The MultichainAssetsControllerMessenger.
 */
export function getMultichainAssetsControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<MultichainAssetsControllerMessenger>,
    MessengerEvents<MultichainAssetsControllerMessenger>
  >,
): MultichainAssetsControllerMessenger {
  const messenger: MultichainAssetsControllerMessenger = new Messenger({
    namespace: 'MultichainAssetsController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'PermissionController:getPermissions',
      'SnapController:handleRequest',
      'SnapController:getRunnableSnaps',
      'AccountsController:listMultichainAccounts',
      'PhishingController:bulkScanTokens',
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
