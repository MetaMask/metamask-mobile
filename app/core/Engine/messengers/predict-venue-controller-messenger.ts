import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import {
  PREDICT_VENUE_CONTROLLER_NAME,
  type PredictVenueControllerMessenger,
} from '../../../components/UI/PredictNext/implementation/PredictVenueController';
import type { RootMessenger } from '../types';

/**
 * Get the messenger for the Predict Venue controller. It reads
 * `GeolocationController` state and its changes, and calls no geolocation
 * fetch: the Engine-start fetch is the only one.
 *
 * @param rootMessenger - The root messenger.
 * @returns The PredictVenueControllerMessenger.
 */
export const getPredictVenueControllerMessenger = (
  rootMessenger: RootMessenger<
    MessengerActions<PredictVenueControllerMessenger>,
    MessengerEvents<PredictVenueControllerMessenger>
  >,
): PredictVenueControllerMessenger => {
  const messenger: PredictVenueControllerMessenger = new Messenger({
    namespace: PREDICT_VENUE_CONTROLLER_NAME,
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['GeolocationController:getState'],
    events: ['GeolocationController:stateChange'],
    messenger,
  });
  return messenger;
};
