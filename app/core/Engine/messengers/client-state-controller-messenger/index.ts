import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { ClientStateControllerMessenger } from '@metamask/client-state-controller';
import type { RootExtendedMessenger, RootMessenger } from '../../types';

/**
 * Get the ClientStateControllerMessenger for the ClientStateController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The ClientStateControllerMessenger.
 */
export function getClientStateControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): ClientStateControllerMessenger {
  const messenger = new Messenger<
    'ClientStateController',
    MessengerActions<ClientStateControllerMessenger>,
    MessengerEvents<ClientStateControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ClientStateController',
    parent: rootExtendedMessenger,
  });
  return messenger;
}
