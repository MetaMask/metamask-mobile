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
 * PerpsController no longer delegates cross-controller actions through the messenger.
 * All controller interactions are handled via PerpsPlatformDependencies.controllers.*
 * injected through mobileInfrastructure.ts.
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
