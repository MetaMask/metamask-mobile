import { Messenger } from '@metamask/messenger';
import { SnapRegistryControllerMessenger } from '@metamask/snaps-controllers';
import { RootMessenger } from '../../types';

/**
 * Get a messenger for the Snaps registry. This is scoped to the
 * actions and events that the Snaps registry is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The Snap registry controller messenger.
 */
export function getSnapRegistryControllerMessenger(
  rootMessenger: RootMessenger,
): SnapRegistryControllerMessenger {
  const messenger: SnapRegistryControllerMessenger = new Messenger({
    namespace: 'SnapRegistryController',
    parent: rootMessenger,
  });

  return messenger;
}
