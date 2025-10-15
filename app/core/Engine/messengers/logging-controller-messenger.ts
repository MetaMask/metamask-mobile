import { Messenger } from '@metamask/base-controller';

type AllowedActions = never;

type AllowedEvents = never;

export type LoggingControllerMessenger = ReturnType<
  typeof getLoggingControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * logging controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getLoggingControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'LoggingController',
    allowedActions: [],
    allowedEvents: [],
  });
}
