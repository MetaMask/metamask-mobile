import useRampsSmartRouting from './hooks/useRampsSmartRouting';

/**
 * Ramps app bootstrap: runs smart routing, controller hydration, and provider
 * auto-selection as soon as the app mounts so that by the time the user taps
 * Buy, region, providers, tokens, and selected provider are ready.
 *
 * Geolocation is handled by GeolocationController during Engine startup, so
 * this bootstrap no longer performs geolocation detection itself.
 *
 * V2: RampsController is initialized by Engine (rampsControllerInit). Provider
 * auto-selection runs when providers load. Mount at app root.
 */
function RampsBootstrap(): null {
  useRampsSmartRouting();
  return null;
}

export default RampsBootstrap;
