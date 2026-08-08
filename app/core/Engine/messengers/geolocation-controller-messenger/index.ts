import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type { GeolocationControllerMessenger } from '@metamask/geolocation-controller';
import type { RootMessenger } from '../../types';

const name = 'GeolocationController' as const;

/**
 * Get the messenger for the GeolocationController. Delegates the
 * GeolocationApiService:fetchGeolocation action so the controller can
 * call the API service via the messenger.
 *
 * @param rootMessenger - The root messenger.
 * @returns The GeolocationControllerMessenger.
 */
export function getGeolocationControllerMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<GeolocationControllerMessenger>,
    MessengerEvents<GeolocationControllerMessenger>
  >,
): GeolocationControllerMessenger {
  const messenger: GeolocationControllerMessenger = new Messenger({
    namespace: name,
    parent: rootMessenger,
  });

  rootMessenger.delegate({
    messenger,
    actions: ['GeolocationApiService:fetchGeolocation'],
    events: [],
  });

  return messenger;
}
