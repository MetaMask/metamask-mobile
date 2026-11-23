import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { LimitOrdersDataServiceMessenger } from '../../../components/UI/Bridge/services/LimitOrdersDataService';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the LimitOrdersDataService. This is scoped to the
 * actions and events the service is allowed to handle, plus the
 * StorageService actions it needs to persist and rehydrate its cache.
 *
 * @param rootMessenger - The root messenger.
 * @returns The LimitOrdersDataServiceMessenger.
 */
export function getLimitOrdersDataServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<LimitOrdersDataServiceMessenger>,
    MessengerEvents<LimitOrdersDataServiceMessenger>
  >,
): LimitOrdersDataServiceMessenger {
  const messenger: LimitOrdersDataServiceMessenger = new Messenger({
    namespace: 'LimitOrdersDataService',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: [
      'StorageService:getItem',
      'StorageService:setItem',
      'StorageService:removeItem',
    ],
    events: [],
    messenger,
  });

  return messenger;
}
