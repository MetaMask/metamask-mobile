/**
 * In-memory timestamp of the current lock/overlay session.
 * Route restore measures its window from here (same process only; no persist).
 */
let lockedAt: number | null = null;

/**
 * Focused route name captured when the restore window expired behind the
 * lock cover (tree already reset to Home). Lets `Route Restore Evaluated` keep
 * reporting the screen the user abandoned. Cleared with `lockedAt`.
 */
let expiredRoute: string | null = null;

export const getWalletLockedAt = (): number | null => lockedAt;

export const setWalletLockedAt = (value: number | null): void => {
  lockedAt = value;
  if (value === null) {
    expiredRoute = null;
  }
};

export const getWalletLockExpiredRoute = (): string | null => expiredRoute;

export const setWalletLockExpiredRoute = (route: string | null): void => {
  expiredRoute = route;
};

/** Test-only — clears the clock between suites. */
export const resetWalletLockedAtForTesting = (): void => {
  lockedAt = null;
  expiredRoute = null;
};
