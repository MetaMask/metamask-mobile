import Routes from '../../constants/navigation/Routes';
import {
  __resetWalletLockedForTests,
  setWalletLocked,
} from '../../core/WalletLockLifecycle';
import {
  LATE_FIRE_TOLERANCE_MS,
  __isRestoreWindowExpiryScheduledForTests,
  cancelRestoreWindowExpiry,
  expireRestoreWindow,
  scheduleRestoreWindowExpiry,
} from './restoreWindowExpiry';
import {
  getWalletLockExpiredRoute,
  resetWalletLockedAtForTesting,
  setWalletLockedAt,
} from './walletLockClock';

const mockReset = jest.fn();
let mockRootState: unknown;
let mockNavigationPresent = true;

jest.mock('../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      if (!mockNavigationPresent) {
        return undefined;
      }
      return {
        reset: (...args: unknown[]) => mockReset(...args),
        getRootState: () => mockRootState,
      };
    },
  },
}));

const perpsDetailsTree = {
  index: 0,
  routes: [
    {
      name: 'NavigationChildren',
      state: {
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.HOME_NAV,
            state: {
              index: 0,
              routes: [
                {
                  name: Routes.PERPS.ROOT,
                  state: {
                    index: 1,
                    routes: [
                      { name: Routes.PERPS.PERPS_HOME },
                      { name: Routes.PERPS.MARKET_DETAILS },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
};

const HOME_RESET = { routes: [{ name: Routes.ONBOARDING.HOME_NAV }] };
const WINDOW_MS = 10_000;

describe('restoreWindowExpiry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_700_000_000_000);
    jest.clearAllMocks();
    resetWalletLockedAtForTesting();
    __resetWalletLockedForTests();
    cancelRestoreWindowExpiry();
    mockRootState = perpsDetailsTree;
    mockNavigationPresent = true;
  });

  afterEach(() => {
    cancelRestoreWindowExpiry();
    jest.useRealTimers();
  });

  const lockNow = () => {
    const now = Date.now();
    setWalletLockedAt(now);
    setWalletLocked(true);
    scheduleRestoreWindowExpiry({ lockedAt: now, restoreWindowMs: WINDOW_MS });
  };

  it('resets to Home behind the lock cover once the window elapses in foreground', () => {
    lockNow();

    jest.advanceTimersByTime(WINDOW_MS + 1);

    expect(mockReset).toHaveBeenCalledWith(HOME_RESET);
    expect(getWalletLockExpiredRoute()).toBe(Routes.PERPS.MARKET_DETAILS);
    expect(__isRestoreWindowExpiryScheduledForTests()).toBe(false);
  });

  it('does nothing before the window elapses', () => {
    lockNow();

    jest.advanceTimersByTime(WINDOW_MS - 1);

    expect(mockReset).not.toHaveBeenCalled();
    expect(getWalletLockExpiredRoute()).toBeNull();
  });

  it('skips a late fire (timer suspended in background) and leaves it to unlock', () => {
    lockNow();

    // Background froze the timer; on resume it runs well past its due time.
    jest.setSystemTime(Date.now() + WINDOW_MS + LATE_FIRE_TOLERANCE_MS + 5_000);
    jest.advanceTimersByTime(WINDOW_MS + 1);

    expect(mockReset).not.toHaveBeenCalled();
    expect(getWalletLockExpiredRoute()).toBeNull();
    expect(__isRestoreWindowExpiryScheduledForTests()).toBe(false);
  });

  it('does not arm when the window already passed at lock (lock landed on resume)', () => {
    setWalletLockedAt(Date.now() - WINDOW_MS - 1);
    setWalletLocked(true);

    scheduleRestoreWindowExpiry({
      lockedAt: Date.now() - WINDOW_MS - 1,
      restoreWindowMs: WINDOW_MS,
    });

    expect(__isRestoreWindowExpiryScheduledForTests()).toBe(false);
    jest.runOnlyPendingTimers();
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('is a no-op when unlock cancelled it first', () => {
    lockNow();

    cancelRestoreWindowExpiry();
    jest.advanceTimersByTime(WINDOW_MS + 1);

    expect(mockReset).not.toHaveBeenCalled();
  });

  it('is a no-op when the wallet is no longer locked at fire time', () => {
    lockNow();
    setWalletLocked(false);

    jest.advanceTimersByTime(WINDOW_MS + 1);

    expect(mockReset).not.toHaveBeenCalled();
  });

  it('is a no-op when the session tree is already gone', () => {
    lockNow();
    mockRootState = { index: 0, routes: [{ name: Routes.ONBOARDING.LOGIN }] };

    jest.advanceTimersByTime(WINDOW_MS + 1);

    expect(mockReset).not.toHaveBeenCalled();
    expect(getWalletLockExpiredRoute()).toBeNull();
  });

  it('is a no-op without a navigation ref', () => {
    lockNow();
    mockNavigationPresent = false;

    jest.advanceTimersByTime(WINDOW_MS + 1);

    expect(mockReset).not.toHaveBeenCalled();
  });

  it('replaces a previously armed expiry when a new lock is scheduled', () => {
    lockNow();

    scheduleRestoreWindowExpiry({
      lockedAt: Date.now(),
      restoreWindowMs: WINDOW_MS * 10,
    });
    jest.advanceTimersByTime(WINDOW_MS + 1);

    expect(mockReset).not.toHaveBeenCalled();
  });

  it('fires only once per lock session', () => {
    lockNow();

    jest.advanceTimersByTime(WINDOW_MS + 1);
    expect(expireRestoreWindow()).toBe(false);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
