import { ClientControllerMessenger } from '@metamask/client-controller';
import {
  Messenger,
  MessengerEvents,
  MessengerActions,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

/**
 * Get the ClientControllerMessenger for the ClientController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ClientControllerMessenger.
 */
export function getClientControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<ClientControllerMessenger>,
    MessengerEvents<ClientControllerMessenger>
  >,
): ClientControllerMessenger {
  const messenger: ClientControllerMessenger = new Messenger({
    namespace: 'ClientController',
    parent: rootMessenger,
  });
  return messenger;
}
