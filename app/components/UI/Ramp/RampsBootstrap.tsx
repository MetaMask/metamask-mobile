import useDetectGeolocation from './hooks/useDetectGeolocation';
import useHydrateRampsController from './hooks/useHydrateRampsController';
import useRampsSmartRouting from './hooks/useRampsSmartRouting';

/**
 * Ramps app bootstrap: runs geolocation detection, smart routing, and controller
 * hydration as soon as the app mounts so that by the time the user reaches Buy →
 * Token Selection (non-V2), detectedGeolocation and rampRoutingDecision are
 * often already set.
 *
 * V2: RampsController is initialized by Engine (rampsControllerInit); no UI
 * init. Mount at app root.
 */
function RampsBootstrap(): null {
  useDetectGeolocation();
  useRampsSmartRouting();
  useHydrateRampsController();
  return null;
}

export default RampsBootstrap;
