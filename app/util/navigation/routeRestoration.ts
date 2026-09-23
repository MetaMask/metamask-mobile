import type { NavigationState, PartialState } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { MINUTE } from '../../constants/time';

/**
 * How long after backgrounding a user may return and still land on the screen
 * they left. Measured from the `background` event rather than from the lock,
 * so it is independent of the user's auto-lock setting.
 */
export const ROUTE_RESTORE_WINDOW_MS = 5 * MINUTE;

/**
 * The only screens a user may be left on after unlocking. This is a veto, not a
 * destination: nothing navigates *to* these routes. The screen is already
 * mounted underneath the lock and login screens, and this list decides whether
 * uncovering it is allowed.
 *
 * Adding an entry is one line; owning it is not. Before adding one, confirm the
 * screen refetches prices, quotes and balances rather than rendering stale
 * values, that any socket reconnects, that nothing has silently expired, and
 * that it does not reset its own state on focus. Confirmation and signing
 * screens are never listed.
 */
export const RESTORABLE_ROUTES: readonly string[] = [
  Routes.TRENDING_VIEW, // Explore
  Routes.REWARDS_VIEW,

  // A section appears under two names depending on how deep the user is, and
  // both are needed. Inside its own stack — say Perps home beneath an order
  // form pushed on top — the home screen's own name is what is reachable.
  // But a section's detail screens and modals are registered as *siblings* of
  // its stack in MainNavigator rather than inside it, so from one of those the
  // only thing reachable is the stack's container name.
  Routes.MONEY.ROOT,
  Routes.MONEY.HOME,
  Routes.PERPS.ROOT,
  Routes.PERPS.PERPS_HOME,
  Routes.PREDICT.ROOT,
  // Predictions has two homes; which one renders is behind a remote flag.
  Routes.PREDICT.MARKET_LIST,
  Routes.PREDICT.FEED,
  Routes.BRIDGE.ROOT,
  Routes.BRIDGE.BRIDGE_VIEW, // Swap
  Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
];

type AnyNavigationState = NavigationState | PartialState<NavigationState>;

type AnyRoute = AnyNavigationState['routes'][number];

export type RouteRestoreRejection =
  | 'flag_off'
  | 'no_tree'
  | 'window_expired'
  | 'not_restorable';

export type RouteRestoreDecision =
  | {
      restore: true;
      /** The allow-listed route to land on. */
      route: string;
      /**
       * Whether `route` is the screen the user actually left. False means they
       * were deeper and the stack is trimmed back to their section's home.
       */
      exact: boolean;
    }
  | { restore: false; reason: RouteRestoreRejection; route?: string };

const findRoute = (
  state: AnyNavigationState | undefined,
  name: string,
): AnyRoute | undefined => {
  if (!state?.routes) {
    return undefined;
  }

  for (const route of state.routes) {
    if (route.name === name) {
      return route;
    }

    const nested = findRoute(route.state, name);
    if (nested) {
      return nested;
    }
  }

  return undefined;
};

/**
 * Everything the user can be sent back to without navigating forwards, as one
 * level per nested navigator, outermost first. Each level holds the route names
 * up to and including the focused one.
 *
 * Both directions matter. A section's home is often a *sibling below* the
 * focused screen in the same stack — Perps home sits under the order form
 * pushed on top of it — while the tab or stack containing that screen is an
 * ancestor a level out. `popTo` reaches either.
 */
const collectReachableLevels = (state: AnyNavigationState): string[][] => {
  const levels: string[][] = [];
  let current: AnyNavigationState | undefined = state;

  while (current?.routes?.length) {
    const index: number = current.index ?? current.routes.length - 1;
    const route: AnyRoute | undefined = current.routes[index];
    if (!route) {
      break;
    }

    levels.push(current.routes.slice(0, index + 1).map(({ name }) => name));
    current = route.state;
  }

  return levels;
};

/**
 * Decides whether unlocking should uncover the screens the user left, or fall
 * back to today's behaviour of resetting to a fresh home.
 *
 * Pure so the rule can be tested without a navigation container.
 *
 * @param options.rootState - The live root navigation state.
 * @param options.backgroundedAt - When the app last entered the background, or null if it has not.
 * @param options.enabled - Whether the rollout flag is on.
 * @param options.now - Current time, injectable for tests.
 */
export const decideRouteRestore = ({
  rootState,
  backgroundedAt,
  enabled,
  now = Date.now(),
}: {
  rootState: AnyNavigationState | undefined;
  backgroundedAt: number | null;
  enabled: boolean;
  now?: number;
}): RouteRestoreDecision => {
  // feature flag is off
  if (!enabled) {
    return { restore: false, reason: 'flag_off' };
  }

  const homeNav = findRoute(rootState, Routes.ONBOARDING.HOME_NAV);
  if (!homeNav) {
    // Cold start, and also manual lock and logout, both of which reset to the
    // login screen and leave nothing to uncover.
    return { restore: false, reason: 'no_tree' };
  }

  // A mounted-but-unvisited HomeNav has no nested state of its own yet.
  const levels = homeNav.state ? collectReachableLevels(homeNav.state) : [];
  const innermost = levels[levels.length - 1];
  const focused =
    innermost?.[innermost.length - 1] ?? Routes.ONBOARDING.HOME_NAV;

  if (
    backgroundedAt === null ||
    now - backgroundedAt > ROUTE_RESTORE_WINDOW_MS
  ) {
    return { restore: false, reason: 'window_expired', route: focused };
  }

  // Innermost first, and within a level nearest the focused screen first, so a
  // user in a Perps order form lands on Perps home rather than on the tab that
  // contains it.
  for (let level = levels.length - 1; level >= 0; level--) {
    const names = levels[level];

    for (let i = names.length - 1; i >= 0; i--) {
      if (!RESTORABLE_ROUTES.includes(names[i])) {
        continue;
      }

      return {
        restore: true,
        route: names[i],
        exact: level === levels.length - 1 && i === names.length - 1,
      };
    }
  }

  return { restore: false, reason: 'not_restorable', route: focused };
};
