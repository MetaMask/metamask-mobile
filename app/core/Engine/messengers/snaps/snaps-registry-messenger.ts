import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { SnapsRegistryMessenger as SnapsRegistryMessengerType } from '@metamask/snaps-controllers';
import { RootMessenger } from '../../types';

/**
 * Get a messenger for the Snaps registry. This is scoped to the
 * actions and events that the Snaps registry is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SnapsRegistryMessenger.
 */
export function getSnapsRegistryMessenger(
  rootMessenger: RootMessenger,
): SnapsRegistryMessengerType {
  const messenger = new Messenger<
    'SnapsRegistry',
    MessengerActions<SnapsRegistryMessengerType>,
    MessengerEvents<SnapsRegistryMessengerType>,
    RootMessenger
  >({
    namespace: 'SnapsRegistry',
    parent: rootMessenger,
  });
  return messenger;
}
