import { Messenger } from '@metamask/messenger';
import { SnapInterfaceControllerMessenger } from '@metamask/snaps-controllers';
import { RootMessenger } from '../../types';

/**
 * Get a messenger for the Snap interface controller. This is scoped
 * to the actions and events that the Snap interface controller is allowed to
 * handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapInterfaceControllerMessenger.
 */
export function getSnapInterfaceControllerMessenger(
  rootMessenger: RootMessenger,
): SnapInterfaceControllerMessenger {
  const messenger: SnapInterfaceControllerMessenger = new Messenger({
    namespace: 'SnapInterfaceController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'PhishingController:testOrigin',
      'ApprovalController:hasRequest',
      'ApprovalController:acceptRequest',
      'SnapController:getSnap',
      'MultichainAssetsController:getState',
      'AccountsController:getSelectedMultichainAccount',
      'AccountsController:getAccountByAddress',
      'AccountsController:listMultichainAccounts',
      'PermissionController:hasPermission',
    ],
    events: ['NotificationServicesController:notificationsListUpdated'],
    messenger,
  });
  return messenger;
}
