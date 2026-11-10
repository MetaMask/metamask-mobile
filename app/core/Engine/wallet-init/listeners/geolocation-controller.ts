import {
  UNKNOWN_LOCATION,
  type GeolocationController,
} from '@metamask/geolocation-controller';

/**
 * Eagerly fetch geolocation on Engine start so the value is available to all
 * consumers (Ramp, Perps, Rewards, Card) before they need it.
 *
 * Skipped when the hydrated state already has a known location to avoid
 * overwriting it (all controller state fields are non-persistent, so a known
 * location only exists when hydrated from E2E fixtures or redux).
 *
 * @param geolocationController - The wallet-owned GeolocationController.
 */
export function fetchInitialGeolocation(
  geolocationController: GeolocationController,
): void {
  const { location } = geolocationController.state;
  const hasKnownLocation = location !== UNKNOWN_LOCATION && location !== '';

  if (hasKnownLocation) {
    return;
  }

  geolocationController.getGeolocation().catch(() => {
    // Best-effort fetch; errors are surfaced via controller state.
  });
}
