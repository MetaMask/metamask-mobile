import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ChompApiServiceMessenger } from '@metamask-previews/chomp-api-service';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the CHOMP API service. This is scoped to the
 * actions and events that the CHOMP API service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ChompApiServiceMessenger.
 */
export function getChompApiServiceMessenger(
  rootMessenger: RootMessenger,
): ChompApiServiceMessenger {
  const messenger = new Messenger<
    'ChompApiService',
    MessengerActions<ChompApiServiceMessenger>,
    MessengerEvents<ChompApiServiceMessenger>,
    RootMessenger
  >({
    namespace: 'ChompApiService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });
  return messenger;
}
