import { addEventListener } from '@react-native-community/netinfo';
import {
  UNKNOWN_LOCATION,
  type GeolocationController,
} from '@metamask/geolocation-controller';

const hasKnownLocation = (
  geolocationController: GeolocationController,
): boolean => {
  const { location } = geolocationController.state;
  return location !== UNKNOWN_LOCATION && location !== '';
};

/**
 * Eagerly fetch geolocation on Engine start so the value is available to all
 * consumers (Ramp, Perps, Rewards, Card, Money) before they need it.
 *
 * Skipped when the hydrated state already has a known location to avoid
 * overwriting it (all controller state fields are non-persistent, so a known
 * location only exists when hydrated from E2E fixtures or redux).
 *
 * If the initial fetch fails (e.g. the app was opened offline), the lookup is
 * retried once internet connectivity is restored. Without this, consumers that
 * fail closed on an unknown location (such as the Money account geo gate) stay
 * blocked until the app is restarted.
 *
 * @param geolocationController - The wallet-owned GeolocationController.
 * @returns A function that stops listening for connectivity changes.
 */
export function fetchInitialGeolocation(
  geolocationController: GeolocationController,
): () => void {
  if (hasKnownLocation(geolocationController)) {
    return () => undefined;
  }

  geolocationController.getGeolocation().catch(() => {
    // Best-effort fetch; errors are surfaced via controller state.
  });

  let isRetrying = false;
  let isStopped = false;
  // NetInfo may invoke the listener synchronously during `addEventListener`
  // (when it already has a cached state), so the unsubscribe handle can be
  // undefined on that first call. `isStopped` covers that window.
  const subscription: { remove?: () => void } = {};

  const unsubscribe = () => {
    isStopped = true;
    subscription.remove?.();
  };

  subscription.remove = addEventListener(({ isInternetReachable }) => {
    if (isStopped) {
      return;
    }

    if (hasKnownLocation(geolocationController)) {
      unsubscribe();
      return;
    }

    if (
      isRetrying ||
      isInternetReachable !== true ||
      geolocationController.state.status !== 'error'
    ) {
      return;
    }

    isRetrying = true;
    geolocationController
      .refreshGeolocation()
      .catch(() => {
        // Best-effort retry; errors are surfaced via controller state.
      })
      .finally(() => {
        isRetrying = false;
        if (hasKnownLocation(geolocationController)) {
          unsubscribe();
        }
      });
  });

  if (isStopped) {
    subscription.remove();
  }

  return unsubscribe;
}
