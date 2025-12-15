import { Messenger } from '@metamask/messenger';
import type { RampsControllerMessenger } from '@metamask/ramps-controller';
import type { RootMessenger } from '../../types';

/**
 * Get the RampsControllerMessenger for the RampsController.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsControllerMessenger.
 */
export function getRampsControllerMessenger(
  rootMessenger: RootMessenger,
): RampsControllerMessenger {
  const messenger = new Messenger({
    namespace: 'RampsController',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: ['RampsService:getGeolocation'],
    events: [],
  });

  return messenger;
}
