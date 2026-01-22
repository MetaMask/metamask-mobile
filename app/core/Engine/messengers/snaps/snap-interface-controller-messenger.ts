import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { SnapInterfaceControllerMessenger } from '@metamask/snaps-controllers';
import { MaybeUpdateState } from '@metamask/phishing-controller';
import { RootMessenger } from '../../types';

export { type SnapInterfaceControllerMessenger };

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
  const messenger = new Messenger<
    'SnapInterfaceController',
    MessengerActions<SnapInterfaceControllerMessenger> | MaybeUpdateState,
    MessengerEvents<SnapInterfaceControllerMessenger>,
    RootMessenger
  >({
    namespace: 'SnapInterfaceController',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'PhishingController:maybeUpdateState',
      'PhishingController:testOrigin',
      'ApprovalController:hasRequest',
      'ApprovalController:acceptRequest',
      'SnapController:get',
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
