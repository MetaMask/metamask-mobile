import { Messenger } from '@metamask/base-controller';

type AllowedActions = never;

type AllowedEvents = never;

export type ErrorReportingServiceMessenger = ReturnType<
  typeof getErrorReportingServiceMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * error reporting service is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getErrorReportingServiceMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'ErrorReportingService',
    allowedActions: [],
    allowedEvents: [],
  });
}
