import Routes from '../../constants/navigation/Routes';
import NavigationService from '../../core/NavigationService';
import { getWalletLocked } from '../../core/WalletLockLifecycle';
import { decideRouteRestore } from './routeRestoration';
import {
  getWalletLockedAt,
  setWalletLockExpiredRoute,
} from './walletLockClock';

/**
 * A timer firing later than this after its due time was suspended in
 * background and is running on resume. Resetting then races Login painting
 * and the biometric prompt (visible flash), so the unlock path handles it.
 */
export const LATE_FIRE_TOLERANCE_MS = 1_000;

let timeoutId: ReturnType<typeof setTimeout> | null = null;
let scheduledWindowMs: number | null = null;

/**
 * Stops the pending expiry (unlock, logout, or a new lock replacing it).
 */
export const cancelRestoreWindowExpiry = (): void => {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  scheduledWindowMs = null;
};

/**
 * Resets the locked session to Home **behind the lock cover** once the restore
 * window has elapsed while the app sits foregrounded on the lock screen, so
 * unlock reveals a clean Home instead of tearing the old screen down.
 *
 * Runs at most once per lock session. Skips when the timer fires late
 * (suspended in background): on resume the unlock path resets instead, under
 * the lock cover, after the user authenticates.
 */
export const expireRestoreWindow = ({
  now = Date.now(),
}: { now?: number } = {}): boolean => {
  const lockedAt = getWalletLockedAt();
  const windowMs = scheduledWindowMs;
  cancelRestoreWindowExpiry();

  if (!getWalletLocked() || lockedAt === null || windowMs === null) {
    return false;
  }
  const overdueMs = now - (lockedAt + windowMs);
  if (overdueMs <= 0 || overdueMs > LATE_FIRE_TOLERANCE_MS) {
    return false;
  }

  const navigation = NavigationService.navigation;
  if (!navigation) {
    return false;
  }

  // `enabled: true` so the walk runs; we only need the focused route name and
  // a `no_tree` signal (logout / reset wallet already replaced the tree).
  const decision = decideRouteRestore({
    rootState: navigation.getRootState(),
    lockedAt,
    enabled: true,
    restoreWindowMs: windowMs,
    now,
  });
  if (!decision.restore && decision.reason === 'no_tree') {
    return false;
  }

  setWalletLockExpiredRoute(decision.route ?? Routes.ONBOARDING.HOME_NAV);
  navigation.reset({ routes: [{ name: Routes.ONBOARDING.HOME_NAV }] });
  return true;
};

/**
 * Arms the expiry for the current lock session. Not armed when the window has
 * already passed (a lock that landed on resume): unlock handles that case.
 */
export const scheduleRestoreWindowExpiry = ({
  lockedAt,
  restoreWindowMs,
  now = Date.now(),
}: {
  lockedAt: number;
  restoreWindowMs: number;
  now?: number;
}): void => {
  cancelRestoreWindowExpiry();

  const remainingMs = lockedAt + restoreWindowMs - now;
  if (remainingMs <= 0) {
    return;
  }

  scheduledWindowMs = restoreWindowMs;
  timeoutId = setTimeout(() => {
    timeoutId = null;
    expireRestoreWindow();
  }, remainingMs + 1);
};

/** Test-only — reports whether an expiry is armed. */
export const __isRestoreWindowExpiryScheduledForTests = (): boolean =>
  timeoutId !== null;
