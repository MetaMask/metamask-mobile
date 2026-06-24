import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type {
  GeolocationControllerMessenger,
  GeolocationControllerActions,
  GeolocationControllerEvents,
} from '@metamask/geolocation-controller';
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
  rootMessenger: RootMessenger,
): GeolocationControllerMessenger {
  const messenger = new Messenger<
    typeof name,
    MessengerActions<GeolocationControllerMessenger>,
    MessengerEvents<GeolocationControllerMessenger>,
    RootMessenger
  >({
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

export type { GeolocationControllerActions, GeolocationControllerEvents };
