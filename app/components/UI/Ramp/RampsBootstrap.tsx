import useHydrateRampsController from './hooks/useHydrateRampsController';
import useRampsSmartRouting from './hooks/useRampsSmartRouting';

/**
 * Ramps app bootstrap: runs smart routing and controller hydration as soon as
 * the app mounts so that by the time the user reaches Buy → Token Selection
 * (non-V2), rampRoutingDecision is often already set.
 *
 * Geolocation is now handled by GeolocationController (eager fetch on Engine
 * startup), so useDetectGeolocation is no longer needed here.
 *
 * V2: RampsController is initialized by Engine (rampsControllerInit); no UI
 * init. Mount at app root.
 */
function RampsBootstrap(): null {
  useRampsSmartRouting();
  useHydrateRampsController();
  return null;
}

export default RampsBootstrap;
