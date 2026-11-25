import {
  PredictVenueController,
  type PredictVenueControllerMessenger,
} from '../../../components/UI/PredictNext/implementation/PredictVenueController';
import { selectActiveVenue } from '../../../components/UI/PredictNext/implementation/activeVenue';
import { store } from '../../../store';
import type { MessengerClientInitFunction } from '../types';

/**
 * Initialize the PredictVenueController: latch this session's regional
 * default from the Engine-start geolocation fetch, and record every Active
 * Venue `selectActiveVenue` resolves, so the next session can fall back to it
 * whether or not a Predict screen was open.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to hydrate from.
 * @param request.getState - Reads the Redux state.
 * @returns The initialized controller.
 */
export const predictVenueControllerInit: MessengerClientInitFunction<
  PredictVenueController,
  PredictVenueControllerMessenger
> = ({ controllerMessenger, persistedState, getState }) => {
  const controller = new PredictVenueController({
    messenger: controllerMessenger,
    state: persistedState.PredictVenueController,
  });
  controller.init();

  store.subscribe(() => {
    controller.recordActiveVenue(selectActiveVenue(getState()));
  });

  return { controller };
};
