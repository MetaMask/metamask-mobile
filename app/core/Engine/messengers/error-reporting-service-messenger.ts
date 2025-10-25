import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { ErrorReportingServiceMessenger } from '@metamask/error-reporting-service';

import { RootMessenger } from '../types';

/**
 * Get the ErrorReportingServiceMessenger for the ErrorReportingService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ErrorReportingServiceMessenger.
 */
export function getErrorReportingServiceMessenger(
  rootMessenger: RootMessenger,
): ErrorReportingServiceMessenger {
  const messenger = new Messenger<
    'ErrorReportingService',
    MessengerActions<ErrorReportingServiceMessenger>,
    MessengerEvents<ErrorReportingServiceMessenger>,
    RootMessenger
  >({
    namespace: 'ErrorReportingService',
    parent: rootMessenger,
  });
  return messenger;
}
