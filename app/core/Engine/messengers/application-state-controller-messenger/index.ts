import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import type { ApplicationStateControllerMessenger } from '@metamask/application-state-controller';
import type { RootExtendedMessenger, RootMessenger } from '../../types';

/**
 * Get the ApplicationStateControllerMessenger for the ApplicationStateController.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The ApplicationStateControllerMessenger.
 */
export function getApplicationStateControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): ApplicationStateControllerMessenger {
  const messenger = new Messenger<
    'ApplicationStateController',
    MessengerActions<ApplicationStateControllerMessenger>,
    MessengerEvents<ApplicationStateControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ApplicationStateController',
    parent: rootExtendedMessenger,
  });
  return messenger;
}
