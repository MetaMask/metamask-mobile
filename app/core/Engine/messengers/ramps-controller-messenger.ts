import { Messenger } from '@metamask/messenger';
import { RampsControllerMessenger } from '@metamask/ramps-controller';
import { RootMessenger } from '../types';

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
  return messenger;
}
