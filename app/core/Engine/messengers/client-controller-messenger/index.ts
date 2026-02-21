import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { ClientControllerMessenger } from '@metamask/client-controller';
import type { RootExtendedMessenger, RootMessenger } from '../../types';

/**
 * Get the ClientControllerMessenger for the ClientController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The ClientControllerMessenger.
 */
export function getClientControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): ClientControllerMessenger {
  const messenger = new Messenger<
    'ClientController',
    MessengerActions<ClientControllerMessenger>,
    MessengerEvents<ClientControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ClientController',
    parent: rootExtendedMessenger,
  });
  return messenger;
}
