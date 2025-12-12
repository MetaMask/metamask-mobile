import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';
import { StorageServiceMessenger } from '@metamask/storage-service';

import { RootMessenger } from '../types';

/**
 * Get the StorageServiceMessenger for the StorageService.
 *
 * @param rootMessenger - The root messenger.
 * @returns The StorageServiceMessenger.
 */
export function getStorageServiceMessenger(
  rootMessenger: RootMessenger,
): StorageServiceMessenger {
  const messenger = new Messenger<
    'StorageService',
    MessengerActions<StorageServiceMessenger>,
    MessengerEvents<StorageServiceMessenger>,
    RootMessenger
  >({
    namespace: 'StorageService',
    parent: rootMessenger,
  });
  return messenger;
}
