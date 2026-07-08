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
  rootMessenger: RootMessenger<
    MessengerActions<AddressBookControllerMessenger>,
    MessengerEvents<AddressBookControllerMessenger>
  >,
): AddressBookControllerMessenger {
  const messenger: AddressBookControllerMessenger = new Messenger({
    namespace: 'AddressBookController',
    parent: rootMessenger,
  });
  return messenger;
}
