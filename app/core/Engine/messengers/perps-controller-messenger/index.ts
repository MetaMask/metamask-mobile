import { PerpsControllerMessenger } from '@metamask/perps-controller';
import { RootExtendedMessenger, RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get the PerpsControllerMessenger for the PerpsController.
 *
 * PerpsController uses the messenger for all cross-controller communication:
 * NetworkController, KeyringController, TransactionController,
 * RemoteFeatureFlagController, AccountTreeController, AuthenticationController.
 * The root messenger already registers actions for these controllers,
 * so the child messenger can call them through the parent.
 *
 * @param rootExtendedMessenger - The root extended messenger.
 * @returns The PerpsControllerMessenger.
 */
export function getPerpsControllerMessenger(
  rootExtendedMessenger: RootExtendedMessenger,
): PerpsControllerMessenger {
  const messenger = new Messenger<
    'PerpsController',
    MessengerActions<PerpsControllerMessenger>,
    MessengerEvents<PerpsControllerMessenger>,
    RootMessenger
  >({
    namespace: 'PerpsController',
    parent: rootExtendedMessenger,
  });
  return messenger;
}
