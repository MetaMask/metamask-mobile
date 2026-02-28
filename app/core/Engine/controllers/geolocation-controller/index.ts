import {
  GeolocationController,
  type GeolocationControllerMessenger,
} from '@metamask/geolocation-controller';
import type { ControllerInitFunction } from '../../types';

/**
 * Initialize the GeolocationController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const geolocationControllerInit: ControllerInitFunction<
  GeolocationController,
  GeolocationControllerMessenger
> = ({ controllerMessenger }) => {
  const controller = new GeolocationController({
    messenger: controllerMessenger,
  });

  // Eagerly fetch geolocation on Engine start so the value is available
  // to all consumers (Ramp, Perps, Rewards, Card) before they need it.
  controller.getGeolocation().catch(() => {
    // Intentionally swallowed — geolocation is best-effort
  });

  return { controller };
};
