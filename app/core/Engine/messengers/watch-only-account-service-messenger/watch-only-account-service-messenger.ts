import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { WatchOnlyAccountServiceMessenger as ServiceMessenger } from '@metamask/watch-only-account-service';

type Actions = MessengerActions<ServiceMessenger>;
type Events = MessengerEvents<ServiceMessenger>;

export type WatchOnlyAccountServiceMessenger = ServiceMessenger;

/**
 * Get a restricted messenger for the watch-only account service. This is
 * scoped to the actions that this service is allowed to call.
 *
 * @param rootMessenger - The root messenger.
 * @returns The WatchOnlyAccountServiceMessenger.
 */
export function getWatchOnlyAccountServiceMessenger(
  rootMessenger: Messenger<'Root', Actions, Events>,
): WatchOnlyAccountServiceMessenger {
  const messenger: WatchOnlyAccountServiceMessenger = new Messenger({
    namespace: 'WatchOnlyAccountService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    messenger,
    actions: [
      'KeyringController:withController',
      'KeyringController:withKeyringV2',
    ],
  });
  return messenger;
}
