import {
  GeolocationController,
  getDefaultGeolocationControllerState,
  UNKNOWN_LOCATION,
  type GeolocationControllerMessenger,
} from '@metamask/geolocation-controller';
import type { ControllerInitFunction } from '../../types';

/**
 * Initialize the GeolocationController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state to hydrate from.
 * @returns The initialized controller.
 */
export const geolocationControllerInit: ControllerInitFunction<
  GeolocationController,
  GeolocationControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const geolocationControllerState =
    persistedState.GeolocationController ??
    getDefaultGeolocationControllerState();

  const controller = new GeolocationController({
    messenger: controllerMessenger,
    state: geolocationControllerState,
  });

  // Eagerly fetch geolocation on Engine start so the value is available
  // to all consumers (Ramp, Perps, Rewards, Card) before they need it.
  // Skip when the persisted/fixture state already has a known location to
  // avoid overwriting it (all controller state fields are non-persistent, so
  // a known location only exists when hydrated from E2E fixtures or redux).
  const hasKnownLocation =
    geolocationControllerState.location !== UNKNOWN_LOCATION &&
    geolocationControllerState.location !== '';

  if (!hasKnownLocation) {
    controller.getGeolocation().catch(() => {
      // Intentionally swallowed — geolocation is best-effort
    });
  }

  return { controller };
};
