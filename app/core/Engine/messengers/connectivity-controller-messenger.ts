import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { ConnectivityControllerMessenger } from '@metamask/connectivity-controller';
import { RootMessenger } from '../types';

/**
 * Get the ConnectivityControllerMessenger for the ConnectivityController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ConnectivityControllerMessenger.
 */
export function getConnectivityControllerMessenger(
  rootMessenger: RootMessenger,
): ConnectivityControllerMessenger {
  return new Messenger<
    'ConnectivityController',
    MessengerActions<ConnectivityControllerMessenger>,
    MessengerEvents<ConnectivityControllerMessenger>,
    RootMessenger
  >({
    namespace: 'ConnectivityController',
    parent: rootMessenger,
  });
}
