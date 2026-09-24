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
  const restorableRoute = Routes.PERPS.PERPS_HOME;

  it('restores when the focused screen is allow-listed and the window is open', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      backgroundedAt: NOW - 60_000,
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
      rootState: buildTree({ focusedRoute: Routes.BRIDGE.BRIDGE_VIEW }),
      backgroundedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    // Login is focused, but the decision is about what it covers.
    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.BRIDGE.BRIDGE_VIEW,
      target: Routes.BRIDGE.BRIDGE_VIEW,
      exact: true,
    });
  });

  it('declines when the flag is off, before inspecting anything else', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      backgroundedAt: NOW,
      enabled: false,
      now: NOW,
    });

    expect(decision).toStrictEqual({ restore: false, reason: 'flag_off' });
  });

  it('declines with no_tree when HomeNav is absent, as on cold start', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ includeHomeNav: false }),
      backgroundedAt: NOW,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({ restore: false, reason: 'no_tree' });
  });

  it('declines once the window has elapsed', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      backgroundedAt: NOW - ROUTE_RESTORE_WINDOW_MS - 1,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'window_expired',
      route: restorableRoute,
    });
  });

  it('declines when the app has not been backgrounded at all', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ focusedRoute: restorableRoute }),
      backgroundedAt: null,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'window_expired',
      route: restorableRoute,
    });
  });

  it('declines when nothing on the way back is allow-listed', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [Routes.WALLET_VIEW, Routes.SETTINGS.NOTIFICATIONS],
      }),
      backgroundedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'not_restorable',
      route: Routes.SETTINGS.NOTIFICATIONS,
    });
  });

  it('trims back to the section home when the user was deeper', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        // The order form is pushed on top of Perps home in the same stack, so
        // home is a sibling below rather than an ancestor.
        stack: [restorableRoute, 'PerpsOrderForm'],
      }),
      backgroundedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: restorableRoute,
      target: restorableRoute,
      exact: false,
    });
  });

  it('returns to a section from a modal registered beside its stack', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        // Predict modals are siblings of the Predict stack in MainNavigator,
        // so the only thing reachable is the stack itself.
        stack: [
          { name: Routes.PREDICT.ROOT, focused: Routes.PREDICT.MARKET_LIST },
          Routes.PREDICT.MODALS.ROOT,
        ],
      }),
      backgroundedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    // Popping to the stack lands on the screen focused inside it.
    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.PREDICT.MARKET_LIST,
      target: Routes.PREDICT.ROOT,
      exact: false,
    });
  });

  it('returns to a section from a detail screen registered beside its stack', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          { name: Routes.MONEY.ROOT, focused: Routes.MONEY.HOME },
          Routes.MONEY.TRANSACTION_DETAILS,
        ],
      }),
      backgroundedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.MONEY.HOME,
      target: Routes.MONEY.ROOT,
      exact: false,
    });
  });

  it('returns to the selected tab from a screen pushed above the tabs', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        // Explore is a tab, and crypto movers is pushed above the whole tab
        // navigator, so `Home` is what is reachable.
        stack: [
          { name: Routes.HOME_TABS, focused: Routes.TRENDING_VIEW },
          Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
        ],
      }),
      backgroundedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.TRENDING_VIEW,
      target: Routes.HOME_TABS,
      exact: false,
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
      backgroundedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: false,
      reason: 'not_restorable',
      route: Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
    });
  });

  it('prefers the nearest allow-listed screen when several are reachable', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({
        stack: [
          Routes.BRIDGE.BRIDGE_VIEW,
          Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
          Routes.BRIDGE.BATCH_SELL_REVIEW,
        ],
      }),
      backgroundedAt: NOW - 1000,
      enabled: true,
      now: NOW,
    });

    expect(decision).toStrictEqual({
      restore: true,
      route: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
      target: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
      exact: false,
    });
  });

  it('treats an unvisited HomeNav as the home route itself', () => {
    const decision = decideRouteRestore({
      rootState: buildTree({ covers: [] }),
      backgroundedAt: NOW - 1000,
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
