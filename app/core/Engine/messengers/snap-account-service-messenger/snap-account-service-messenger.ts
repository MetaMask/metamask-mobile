import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { SnapAccountServiceMessenger as ServiceMessenger } from '@metamask/snap-account-service';

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
  rootMessenger: Messenger<'Root', Actions, Events>,
): SnapAccountServiceMessenger {
  const messenger: SnapAccountServiceMessenger = new Messenger({
    namespace: 'SnapAccountService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger,
    actions: [
      'KeyringController:withController',
      'KeyringController:getState',
      'KeyringController:withKeyringUnsafe',
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
