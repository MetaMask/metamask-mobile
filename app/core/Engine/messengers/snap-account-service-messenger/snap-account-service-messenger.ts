import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { SnapAccountServiceMessenger as ServiceMessenger } from '@metamask/snap-account-service';
import type { RootMessenger } from '../../types';

type Actions = MessengerActions<ServiceMessenger>;
type Events = MessengerEvents<ServiceMessenger>;

export type SnapAccountServiceMessenger = ServiceMessenger;

/**
 * Get a restricted messenger for the snap account service. This is scoped to
 * the actions and events that this service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapAccountServiceMessenger.
 */
export function getSnapAccountServiceMessenger(
  rootMessenger: RootMessenger,
): SnapAccountServiceMessenger {
  const messenger = new Messenger<
    'SnapAccountService',
    Actions,
    Events,
    RootMessenger
  >({
    namespace: 'SnapAccountService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger,
    actions: [
      'KeyringController:withController',
      'KeyringController:getState',
      'SnapController:getState',
      'SnapController:getSnap',
      'SnapController:getRunnableSnaps',
      'AccountTreeController:getAccountGroupObject',
      'AccountTreeController:getSelectedAccountGroup',
    ],
    events: [
      'KeyringController:stateChange',
      'KeyringController:unlock',
      'SnapController:stateChange',
      'SnapController:snapInstalled',
      'SnapController:snapEnabled',
      'SnapController:snapDisabled',
      'SnapController:snapBlocked',
      'SnapController:snapUnblocked',
      'SnapController:snapUninstalled',
      'AccountTreeController:selectedAccountGroupChange',
      'AccountTreeController:accountGroupCreated',
      'AccountTreeController:accountGroupUpdated',
      'AccountTreeController:accountGroupRemoved',
    ],
  });
  return messenger;
}
