import Routes from '../../constants/navigation/Routes';
import {
  ROUTE_RESTORE_WINDOW_MS,
  decideRouteRestore,
} from './routeRestoration';

const NOW = 1_700_000_000_000;

/**
 * The shape the app actually produces: AppFlow nested under the wrapper screen
 * NavigationProvider puts around the whole app, with the covers stacked above
 * HomeNav rather than replacing it.
 */
const buildTree = ({
  focusedRoute,
  stack,
  covers = [Routes.LOCK_SCREEN, Routes.ONBOARDING.LOGIN],
  includeHomeNav = true,
}: {
  /** A single screen inside HomeNav. */
  focusedRoute?: string;
  /**
   * A stack inside HomeNav, last entry focused. An entry may be a navigator
   * carrying its own focused child, written `{ name, focused }`.
   */
  stack?: (string | { name: string; focused: string })[];
  covers?: string[];
  includeHomeNav?: boolean;
}) => {
  const inner = stack ?? (focusedRoute ? [focusedRoute] : undefined);

  const appFlowRoutes = [
    ...(includeHomeNav
      ? [
          {
            name: Routes.ONBOARDING.HOME_NAV,
            state: inner
              ? {
                  index: inner.length - 1,
                  routes: inner.map((entry) =>
                    typeof entry === 'string'
                      ? { name: entry }
                      : {
                          name: entry.name,
                          state: {
                            index: 0,
                            routes: [{ name: entry.focused }],
                          },
                        },
                  ),
                }
              : undefined,
          },
        ]
      : []),
    ...covers.map((name) => ({ name })),
  ];

  return {
    index: 0,
    routes: [
      {
        name: 'NavigationChildren',
        state: { index: appFlowRoutes.length - 1, routes: appFlowRoutes },
      },
    ],
  };
};

describe('decideRouteRestore', () => {
  const restorableRoute = Routes.PERPS.ROOT;

  it('restores when the focused screen is allow-listed and the window is open', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      lockedAt: NOW - 60_000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: restorableRoute,
      target: restorableRoute,
      exact: true,
    });
  });

  it('finds the focused screen beneath the covers rather than the cover itself', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: Routes.BRIDGE.ROOT }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    // Login is focused, but the decision is about what it covers.
    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.BRIDGE.ROOT,
      target: Routes.BRIDGE.ROOT,
      exact: true,
    });
  });

  it('declines when the flag is off, before inspecting anything else', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      lockedAt: NOW,
      enabled: false,
      now: NOW,
    });

    expect(decision).toStrictEqual({ restore: false, reason: 'flag_off' });
  });

  it('declines with no_tree when HomeNav is absent, as on cold start', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ includeHomeNav: false }),
      lockedAt: NOW,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({ restore: false, reason: 'no_tree' });
  });

  it('declines once the window has elapsed', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      lockedAt: NOW - ROUTE_RESTORE_WINDOW_MS - 1,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'window_expired',
      route: restorableRoute,
    });
  });

  it('declines when lockedAt is null', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      lockedAt: null,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'window_expired',
      route: restorableRoute,
    });
  });

  it('honours a custom restoreWindowMs', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      lockedAt: NOW - 2_000,
      enabled: true,
      restoreWindowMs: 1_000,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'window_expired',
      route: restorableRoute,
    });
  });

  it('honours a narrowed allowlist', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: Routes.BRIDGE.ROOT }),
      lockedAt: NOW - 1000,
      enabled: true,
      allowedRouteIds: [Routes.PERPS.ROOT],
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'not_restorable',
      route: Routes.BRIDGE.ROOT,
    });
  });

  it('declines when nothing on the way back is allow-listed', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [Routes.WALLET_VIEW, Routes.SETTINGS.NOTIFICATIONS],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'not_restorable',
      route: Routes.SETTINGS.NOTIFICATIONS,
    });
  });

  it('keeps the exact focused screen inside an allowlisted tree', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          {
            name: Routes.PERPS.ROOT,
            focused: Routes.PERPS.MARKET_DETAILS,
          },
        ],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.PERPS.MARKET_DETAILS,
      target: Routes.PERPS.MARKET_DETAILS,
      exact: true,
    });
  });

  it('keeps Home-entered details when the stack root is allowlisted', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          {
            name: Routes.PERPS.ROOT,
            focused: Routes.PERPS.MARKET_DETAILS,
          },
        ],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.PERPS.MARKET_DETAILS,
      target: Routes.PERPS.MARKET_DETAILS,
      exact: true,
    });
  });

  it('keeps a focused sibling when an allowlisted stack sits below it', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          { name: Routes.PREDICT.ROOT, focused: Routes.PREDICT.MARKET_LIST },
          Routes.PREDICT.MODALS.ROOT,
        ],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.PREDICT.MODALS.ROOT,
      target: Routes.PREDICT.MODALS.ROOT,
      exact: true,
    });
  });

  it('keeps a listed sibling detail screen', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [Routes.MONEY.TRANSACTION_DETAILS],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.MONEY.TRANSACTION_DETAILS,
      target: Routes.MONEY.TRANSACTION_DETAILS,
      exact: true,
    });
  });

  it('keeps a screen pushed above an allowlisted tab', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          { name: Routes.HOME_TABS, focused: Routes.TRENDING_VIEW },
          Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        ],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      target: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      exact: true,
    });
  });

  it('keeps the focused child of an allowlisted screen', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          { name: Routes.REWARDS_VIEW, focused: Routes.REWARDS_DASHBOARD },
        ],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.REWARDS_DASHBOARD,
      target: Routes.REWARDS_DASHBOARD,
      exact: true,
    });
  });

  it('does not restore a tab that is not allow-listed', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          { name: Routes.HOME_TABS, focused: Routes.TRANSACTIONS_VIEW },
          Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        ],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'not_restorable',
      route: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
    });
  });

  it('keeps a nested Bridge screen when the stack root is allowlisted', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          {
            name: Routes.BRIDGE.ROOT,
            focused: Routes.BRIDGE.BATCH_SELL_REVIEW,
          },
        ],
      }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.BRIDGE.BATCH_SELL_REVIEW,
      target: Routes.BRIDGE.BATCH_SELL_REVIEW,
      exact: true,
    });
  });

  it('treats an unvisited HomeNav as the home route itself', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ covers: [] }),
      lockedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'not_restorable',
      route: Routes.ONBOARDING.HOME_NAV,
    });
  });
});
