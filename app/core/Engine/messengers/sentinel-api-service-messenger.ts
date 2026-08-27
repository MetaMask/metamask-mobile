import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { SentinelApiServiceMessenger } from '@metamask/sentinel-api-service';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the Sentinel API service. This is scoped to the
 * actions and events that the Sentinel API service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The SentinelApiServiceMessenger.
 */
export function getSentinelApiServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<SentinelApiServiceMessenger>,
    MessengerEvents<SentinelApiServiceMessenger>
  >,
): SentinelApiServiceMessenger {
  const messenger: SentinelApiServiceMessenger = new Messenger({
    namespace: 'SentinelApiService',
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    actions: ['AuthenticationController:getBearerToken'],
    events: [],
    messenger,
  });

  return messenger;
}
