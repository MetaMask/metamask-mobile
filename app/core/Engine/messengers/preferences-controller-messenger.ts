import { Messenger } from '@metamask/base-controller';
import { KeyringControllerStateChangeEvent } from '@metamask/keyring-controller';

type AllowedActions = never;

type AllowedEvents = KeyringControllerStateChangeEvent;

export type PreferencesControllerMessenger = ReturnType<
  typeof getPreferencesControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * preferences controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getPreferencesControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'PreferencesController',
    allowedActions: [],
    allowedEvents: ['KeyringController:stateChange'],
  });
}
