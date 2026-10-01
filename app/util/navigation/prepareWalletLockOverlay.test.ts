import {
  findParentNavigatorContainingRoute,
  prepareWalletLockOverlay,
} from './prepareWalletLockOverlay';
import {
  getWalletLockedAt,
  resetWalletLockedAtForTesting,
  setWalletLockedAt,
} from './walletLockClock';
import {
  __resetWalletLockedForTests,
  getWalletLocked,
} from '../../core/WalletLockLifecycle';
import Routes from '../../constants/navigation/Routes';

const mockDispatch = jest.fn();
const mockScheduleRestoreWindowExpiry = jest.fn();
let mockRestoreSettings = { enabled: false, restoreWindowMs: 300_000 };

jest.mock('../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      dispatch: (...args: unknown[]) => mockDispatch(...args),
      getRootState: jest.fn(),
    },
  },
}));

jest.mock('../../core/redux', () => ({
  __esModule: true,
  default: { store: { getState: () => ({}) } },
}));

jest.mock('../../selectors/featureFlagController/routeRestoration', () => ({
  selectRouteRestorationSettings: () => mockRestoreSettings,
}));

jest.mock('./restoreWindowExpiry', () => ({
  scheduleRestoreWindowExpiry: (...args: unknown[]) =>
    mockScheduleRestoreWindowExpiry(...args),
}));

const PERPS_STACK_KEY = 'perps-stack-key';

const nestedPerpsTree = {
  key: 'root',
  index: 0,
  routes: [
    {
      name: 'NavigationChildren',
      state: {
        key: 'nav-children',
        index: 0,
        routes: [
          {
            name: Routes.ONBOARDING.HOME_NAV,
            state: {
              key: 'home-nav',
              type: 'stack',
              index: 0,
              routes: [
                {
                  name: Routes.PERPS.ROOT,
                  state: {
                    key: PERPS_STACK_KEY,
                    type: 'stack',
                    index: 1,
                    routes: [
                      {
                        name: Routes.PERPS.PERPS_HOME,
                        key: 'perps-home-old',
                      },
                      {
                        name: Routes.PERPS.MARKET_DETAILS,
                        key: 'perps-btc-details',
                      },
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

describe('findParentNavigatorContainingRoute', () => {
  it('returns the Perps stack that directly owns the catalog home', () => {
    const parent = findParentNavigatorContainingRoute(
      nestedPerpsTree,
      Routes.PERPS.PERPS_HOME,
    );

    expect(parent?.key).toBe(PERPS_STACK_KEY);
    expect(parent?.type).toBe('stack');
  });
});

describe('prepareWalletLockOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetWalletLockedAtForTesting();
    __resetWalletLockedForTests();
    mockRestoreSettings = { enabled: false, restoreWindowMs: 300_000 };
  });

  it('stamps lockedAt and isWalletLocked without navigating', () => {
    prepareWalletLockOverlay({ now: 1_700_000_000_000 });

    expect(getWalletLockedAt()).toBe(1_700_000_000_000);
    expect(getWalletLocked()).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not arm the window expiry when restore is disabled', () => {
    prepareWalletLockOverlay({ now: 1_700_000_000_000 });

    expect(mockScheduleRestoreWindowExpiry).not.toHaveBeenCalled();
  });

  it('keeps a background stamp when the lock dispatch lands later', () => {
    setWalletLockedAt(1_700_000_000_000);
    mockRestoreSettings = { enabled: true, restoreWindowMs: 300_000 };

    prepareWalletLockOverlay({ now: 1_700_000_340_000 });

    expect(getWalletLockedAt()).toBe(1_700_000_000_000);
    expect(mockScheduleRestoreWindowExpiry).toHaveBeenCalledWith({
      lockedAt: 1_700_000_000_000,
      restoreWindowMs: 300_000,
      now: 1_700_000_340_000,
    });
  });

  it('arms the window expiry with the client window when restore is enabled', () => {
    mockRestoreSettings = { enabled: true, restoreWindowMs: 120_000 };

    prepareWalletLockOverlay({ now: 1_700_000_000_000 });

    expect(mockScheduleRestoreWindowExpiry).toHaveBeenCalledWith({
      lockedAt: 1_700_000_000_000,
      restoreWindowMs: 120_000,
      now: 1_700_000_000_000,
    });
  });
});
