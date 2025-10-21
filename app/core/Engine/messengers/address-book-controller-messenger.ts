import { Messenger } from '@metamask/base-controller';

type AllowedActions = never;

type AllowedEvents = never;

export type AddressBookControllerMessenger = ReturnType<
  typeof getAddressBookControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * address book controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getAddressBookControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'AddressBookController',
    allowedActions: [],
    allowedEvents: [],
  });
}
