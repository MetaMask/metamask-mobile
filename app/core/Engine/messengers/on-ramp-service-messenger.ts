import { Messenger } from '@metamask/messenger';
import { OnRampServiceMessenger } from '@metamask/ramps-controller';
import { RootMessenger } from '../types';

/**
 * Get the OnRampServiceMessenger for the OnRampService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The OnRampServiceMessenger.
 */
export function getOnRampServiceMessenger(
  rootMessenger: RootMessenger,
): OnRampServiceMessenger {
  const messenger = new Messenger({
    namespace: 'OnRampService',
    parent: rootMessenger,
  });
  return messenger;
}
