import { Messenger } from '@metamask/base-controller';

type AllowedActions = never;

type AllowedEvents = never;

export type KeyringControllerMessenger = ReturnType<
  typeof getKeyringControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * keyring controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getKeyringControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'KeyringController',
    allowedActions: [],
    allowedEvents: [],
  });
}
