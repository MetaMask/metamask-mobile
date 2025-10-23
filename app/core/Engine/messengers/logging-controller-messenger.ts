import { LoggingControllerMessenger } from '@metamask/logging-controller';
import {
  Messenger,
  MessengerEvents,
  MessengerActions,
} from '@metamask/messenger';
import { RootMessenger } from '../types';

/**
 * Get the LoggingControllerMessenger for the LoggingController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The LoggingControllerMessenger.
 */
export function getLoggingControllerMessenger(
  rootMessenger: RootMessenger,
): LoggingControllerMessenger {
  const messenger = new Messenger<
    'LoggingController',
    MessengerActions<LoggingControllerMessenger>,
    MessengerEvents<LoggingControllerMessenger>,
    RootMessenger
  >({
    namespace: 'LoggingController',
    parent: rootMessenger,
  });
  return messenger;
}
