import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { KeyringControllerMessenger } from '@metamask/keyring-controller';
import { RootMessenger } from '../types';

/**
 * Get the KeyringControllerMessenger for the KeyringController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The KeyringControllerMessenger.
 */
export function getKeyringControllerMessenger(
  rootMessenger: RootMessenger,
): KeyringControllerMessenger {
  const messenger = new Messenger<
    'KeyringController',
    MessengerActions<KeyringControllerMessenger>,
    MessengerEvents<KeyringControllerMessenger>,
    RootMessenger
  >({
    namespace: 'KeyringController',
    parent: rootMessenger,
  });
  return messenger;
}
