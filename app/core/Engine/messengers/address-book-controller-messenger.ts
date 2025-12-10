import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { AddressBookControllerMessenger } from '@metamask/address-book-controller';
import { RootMessenger } from '../types';

/**
 * Get the AddressBookControllerMessenger for the AddressBookController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The AddressBookControllerMessenger.
 */
export function getAddressBookControllerMessenger(
  rootMessenger: RootMessenger,
): AddressBookControllerMessenger {
  const messenger = new Messenger<
    'AddressBookController',
    MessengerActions<AddressBookControllerMessenger>,
    MessengerEvents<AddressBookControllerMessenger>,
    RootMessenger
  >({
    namespace: 'AddressBookController',
    parent: rootMessenger,
  });
  return messenger;
}
