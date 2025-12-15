import { Messenger } from '@metamask/messenger';
import type { RampsServiceMessenger } from '@metamask/ramps-controller';
import type { RootMessenger } from '../../types';

/**
 * Get the RampsServiceMessenger for the RampsService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsServiceMessenger.
 */
export function getRampsServiceMessenger(
  rootMessenger: RootMessenger,
): RampsServiceMessenger {
  return new Messenger({
    namespace: 'RampsService',
    parent: rootMessenger,
  });
}
