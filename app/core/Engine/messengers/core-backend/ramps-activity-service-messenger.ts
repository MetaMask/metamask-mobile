import {
  RAMPS_ACTIVITY_SERVICE_ALLOWED_ACTIONS,
  RAMPS_ACTIVITY_SERVICE_ALLOWED_EVENTS,
  RampsActivityServiceMessenger,
} from '@metamask/core-backend';
import { RootMessenger } from '../../types';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
} from '@metamask/messenger';

/**
 * Get a messenger for the Ramps Activity service. This is scoped to the
 * actions and events that the Ramps Activity service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The RampsActivityServiceMessenger.
 */
export function getRampsActivityServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<RampsActivityServiceMessenger>,
    MessengerEvents<RampsActivityServiceMessenger>
  >,
): RampsActivityServiceMessenger {
  const messenger: RampsActivityServiceMessenger = new Messenger({
    namespace: 'RampsActivityService',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [...RAMPS_ACTIVITY_SERVICE_ALLOWED_ACTIONS],
    events: [...RAMPS_ACTIVITY_SERVICE_ALLOWED_EVENTS],
    messenger,
  });
  return messenger;
}
