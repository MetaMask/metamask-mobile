import type { NavigationState, PartialState } from '@react-navigation/native';
import { setWalletLocked } from '../../core/WalletLockLifecycle';
import ReduxService from '../../core/redux';
import { selectRouteRestorationSettings } from '../../selectors/featureFlagController/routeRestoration';
import { scheduleRestoreWindowExpiry } from './restoreWindowExpiry';
import { getWalletLockedAt, setWalletLockedAt } from './walletLockClock';

type AnyNavigationState = NavigationState | PartialState<NavigationState>;

type AnyRoute = NonNullable<AnyNavigationState['routes']>[number];

interface ParentNavigator {
  key: string;
  type?: string;
  index: number;
  routes: AnyRoute[];
}

/**
 * Navigator whose `routes` array directly contains `routeName`.
 * Used to detect a still-mounted session tree (`HomeNav`) for unlock deeplinks.
 */
export const findParentNavigatorContainingRoute = (
  state: AnyNavigationState | undefined,
  routeName: string,
): ParentNavigator | undefined => {
  if (!state?.routes?.length) {
    return undefined;
  }

  const hasDirectChild = state.routes.some((route) => route.name === routeName);
  if (hasDirectChild && typeof state.key === 'string') {
    return {
      key: state.key,
      type: 'type' in state ? state.type : undefined,
      index: state.index ?? state.routes.length - 1,
      routes: state.routes,
    };
  }

  for (const route of state.routes) {
    const nested = findParentNavigatorContainingRoute(route.state, routeName);
    if (nested) {
      return nested;
    }
  }

  return undefined;
};

const readRestoreSettings = () => {
  try {
    return selectRouteRestorationSettings(ReduxService.store.getState());
  } catch {
    return undefined;
  }
};

/**
 * In-session lock prep: set `isWalletLocked` and keep the background
 * `lockedAt` stamp. The saga then pushes `LockScreen` (and Login on biometric
 * failure) over the still-mounted tree. Nothing is remounted here.
 *
 * `lockedAt` is normally already stamped when the app entered background
 * (`LockManagerService`). A lock that lands late — iOS suspended JS before
 * the AutoLock timer fired — must keep that stamp. Only a lock with no
 * background stamp (none today on the auto-lock path) falls back to `now`.
 *
 * When restore is enabled, arm the window expiry from that stamp so the tree
 * is reset to Home behind the lock cover once the window passes.
 */
export const prepareWalletLockOverlay = ({
  now = Date.now(),
}: {
  now?: number;
} = {}): void => {
  const lockedAt = getWalletLockedAt() ?? now;
  setWalletLockedAt(lockedAt);
  setWalletLocked(true);

  const settings = readRestoreSettings();
  if (!settings?.enabled) {
    return;
  }

  scheduleRestoreWindowExpiry({
    lockedAt,
    restoreWindowMs: settings.restoreWindowMs,
    now,
  });
};
