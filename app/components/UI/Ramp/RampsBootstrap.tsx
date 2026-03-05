import useDetectGeolocation from './hooks/useDetectGeolocation';
import useHydrateRampsController from './hooks/useHydrateRampsController';
import useRampsProviders from './hooks/useRampsProviders';
import useRampsSmartRouting from './hooks/useRampsSmartRouting';

/**
 * Ramps app bootstrap: runs geolocation detection, smart routing, controller
 * hydration, and provider auto-selection as soon as the app mounts so that by
 * the time the user taps Buy, region, providers, tokens, and selected provider
 * are ready.
 *
 * V2: RampsController is initialized by Engine (rampsControllerInit). Provider
 * auto-selection runs when providers load. Mount at app root.
 */
function RampsBootstrap(): null {
  useDetectGeolocation();
  useRampsSmartRouting();
  useHydrateRampsController();
  useRampsProviders();
  return null;
}

export default RampsBootstrap;
