import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { RootMessenger } from '../types';
import type { GeolocationApiServiceMessenger } from '@metamask/geolocation-controller';

/**
 * Get the messenger for the geolocation API service. This is scoped to the
 * actions and events that the geolocation API service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The GeolocationApiServiceMessenger.
 */
export function getGeolocationApiServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<GeolocationApiServiceMessenger>,
    MessengerEvents<GeolocationApiServiceMessenger>
  >,
): GeolocationApiServiceMessenger {
  const messenger: GeolocationApiServiceMessenger = new Messenger({
    namespace: 'GeolocationApiService',
    parent: rootMessenger,
  });
  return messenger;
}
