import { ClientControllerMessenger } from '@metamask/client-controller';
import {
  Messenger,
  MessengerEvents,
  MessengerActions,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

export type { ClientControllerMessenger } from '@metamask/client-controller';

/**
 * Get the ClientControllerMessenger for the ClientController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ClientControllerMessenger.
 */
export function getClientControllerMessenger(
  rootMessenger: RootMessenger,
): ClientControllerMessenger {
  const messenger = new Messenger<
    'ClientController',
    MessengerActions<ClientControllerMessenger>,
    MessengerEvents<ClientControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ClientController',
    parent: rootMessenger,
  });
  return messenger;
}
