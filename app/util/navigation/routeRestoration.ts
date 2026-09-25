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
  Routes.MONEY.HOME,
  Routes.REWARDS_VIEW,
  Routes.PERPS.PERPS_HOME,
  // Predictions has two homes; which one renders is behind a remote flag.
  Routes.PREDICT.MARKET_LIST,
  Routes.PREDICT.FEED,
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
      /** The allow-listed screen the user ends up looking at. */
      route: string;
      /**
       * What to pop back to, which is often a navigator containing `route`
       * rather than `route` itself.
       */
      target: string;
      /**
       * Whether the user is already on `route`. False means they were deeper
       * and the stack is trimmed back to it.
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

interface ReachableLevel {
  routes: AnyRoute[];
  focusedIndex: number;
}

/**
 * Everything the user can be sent back to without navigating forwards, as one
 * level per nested navigator, outermost first. Each level holds the routes up
 * to and including the focused one.
 *
 * Both directions matter. A section's home is often a *sibling below* the
 * focused screen in the same stack — Perps home sits under the order form
 * pushed on top of it — while the tab or stack containing that screen is an
 * ancestor a level out. `popTo` reaches either.
 */
const collectReachableLevels = (
  state: AnyNavigationState,
): ReachableLevel[] => {
  const levels: ReachableLevel[] = [];
  let current: AnyNavigationState | undefined = state;

  while (current?.routes?.length) {
    const index: number = current.index ?? current.routes.length - 1;
    const route: AnyRoute | undefined = current.routes[index];
    if (!route) {
      break;
    }

    levels.push({
      routes: current.routes.slice(0, index + 1),
      focusedIndex: index,
    });
    current = route.state;
  }

  return levels;
};

/**
 * Every screen a user would pass through if sent back to `route`: its own name,
 * then whatever is focused inside it, all the way down.
 *
 * A candidate cannot be judged by its own name alone, because `Home` is a tab
 * navigator whose meaning depends on the selected tab. Nor by its deepest
 * descendant alone, because a top-level route can itself contain a navigator —
 * the Rewards tab renders a stack, so it resolves to `RewardsDashboard`. The
 * whole chain is the answer, and a match anywhere in it means landing on this
 * candidate puts the user on an allow-listed screen.
 */
const focusedChain = (route: AnyRoute): string[] => {
  const names = [route.name];
  let current: AnyNavigationState | undefined = route.state;

  while (current?.routes?.length) {
    const index: number = current.index ?? current.routes.length - 1;
    const next: AnyRoute | undefined = current.routes[index];
    if (!next) {
      break;
    }
    names.push(next.name);
    current = next.state;
  }

  return names;
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
  // First, so that the flag being off is indistinguishable from the feature
  // not existing.
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
  // The walk stops where nesting does, so the innermost focused route is the
  // screen on display.
  const focused =
    innermost?.routes[innermost.routes.length - 1]?.name ??
    Routes.ONBOARDING.HOME_NAV;

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
    const { routes, focusedIndex } = levels[level];

    for (let i = routes.length - 1; i >= 0; i--) {
      const route = focusedChain(routes[i]).find((name) =>
        RESTORABLE_ROUTES.includes(name),
      );

      if (!route) {
        continue;
      }

      return {
        restore: true,
        route,
        target: routes[i].name,
        // A candidate already on the focused path needs no trimming; only one
        // sitting below it in its stack does.
        exact: i === focusedIndex,
      };
    }
  }

  return { restore: false, reason: 'not_restorable', route: focused };
};
