import type { NavigationState, PartialState } from '@react-navigation/native';
import Routes from '../../constants/navigation/Routes';
import { MINUTE } from '../../constants/time';

/**
 * Default restore window after lock (client constant). Change in a release;
 * not remote-configurable in V1 (PM: release update is enough).
 */
export const ROUTE_RESTORE_WINDOW_MS = 5 * MINUTE;

/**
 * Local V1 allowlist of **authorized trees** (SSOT). Not remote.
 *
 * Membership: if any of these route names appears on the reachable path under
 * `HomeNav` (stack root, tab, or product sibling), unlock **keeps the exact
 * focused screen** (only the lock covers are popped). Otherwise fail
 * closed to Home.
 *
 * Prefer product stack roots (`Perps`, `Bridge`, …) so entry from Home cards
 * still matches when the section home is not under the details screen. Tabs
 * without a product stack stay listed by tab/screen name. Secondary MainNav
 * siblings that users leave on (tx details, confirmations, Rewards flow) are
 * listed explicitly.
 *
 * Do **not** list: tutorials, onboarding, modal roots (`*Modals`), Login,
 * LockScreen, or generic wallet Home. No hard denylist — absence from this
 * list is the safety boundary.
 *
 * When adding a screen/navigator, follow
 * `.cursor/rules/route-restoration-allowlist.mdc`.
 */
export const RESTORABLE_ROUTES: readonly string[] = [
  // Explore (tab — no product stack root)
  Routes.TRENDING_VIEW,
  // Money
  Routes.MONEY.ROOT,
  Routes.MONEY.CONFIRMATIONS_ROOT,
  Routes.MONEY.TRANSACTION_DETAILS,
  Routes.MONEY.CARD_TRANSACTION_DETAILS,
  // Rewards
  Routes.REWARDS_VIEW,
  Routes.REWARDS_FLOW,
  Routes.REWARDS_DASHBOARD,
  // Perps
  Routes.PERPS.ROOT,
  Routes.PERPS.POSITION_TRANSACTION,
  Routes.PERPS.ORDER_TRANSACTION,
  Routes.PERPS.FUNDING_TRANSACTION,
  Routes.PERPS.PRICE_ALERTS,
  Routes.PERPS.CREATE_PRICE_ALERT,
  // Predictions
  Routes.PREDICT.ROOT,
  // Bridge / Swap / Batch Sell (same stack) + tx sibling
  Routes.BRIDGE.ROOT,
  Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS,
];

/** Module-level Set for the default allowlist — avoid realloc on every decide. */
const RESTORABLE_ROUTES_SET: ReadonlySet<string> = new Set(RESTORABLE_ROUTES);

type AnyNavigationState = NavigationState | PartialState<NavigationState>;

type AnyRoute = AnyNavigationState['routes'][number];

export type RouteRestoreRejection =
  | 'flag_off'
  | 'no_tree'
  | 'window_expired'
  | 'not_restorable';

export interface RouteDecisionAccept {
  restore: true;
  /** Focused screen the user keeps looking at (analytics `route`). */
  route: string;
  /**
   * Unused for unlock navigation in V1 (uncover only). Kept for analytics /
   * type stability; equals `route`.
   */
  target: string;
  /**
   * Always `true` in V1 — unlock never trims nested screens. Property retained
   * so `Route Restore Evaluated` keeps `restored_exact`.
   */
  exact: true;
}

export interface RouteDecisionReject {
  restore: false;
  reason: RouteRestoreRejection;
  route?: string;
}

export type RouteRestoreDecision = RouteDecisionAccept | RouteDecisionReject;

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
 * Everything reachable without navigating forwards, one level per nested
 * navigator, outermost first. Each level holds routes up to and including the
 * focused one (siblings below the focused screen stay reachable).
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
 * Route name plus focused descendants all the way down.
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

const pathTouchesAllowlist = (
  levels: ReachableLevel[],
  allowlist: ReadonlySet<string>,
): boolean => {
  for (const { routes } of levels) {
    for (const route of routes) {
      if (focusedChain(route).some((name) => allowlist.has(name))) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Decides whether unlocking should uncover the exact screen the user left, or
 * fall back to today's Home reset.
 *
 * Pure so the rule can be tested without a navigation container.
 */
export const decideRouteRestore = ({
  rootState,
  lockedAt,
  enabled,
  restoreWindowMs = ROUTE_RESTORE_WINDOW_MS,
  allowedRouteIds = RESTORABLE_ROUTES,
  now = Date.now(),
}: {
  rootState: AnyNavigationState | undefined;
  lockedAt: number | null;
  enabled: boolean;
  restoreWindowMs?: number;
  /** Defaults to local `RESTORABLE_ROUTES`; injectable for tests. */
  allowedRouteIds?: readonly string[];
  now?: number;
}): RouteRestoreDecision => {
  if (!enabled) {
    return { restore: false, reason: 'flag_off' };
  }

  const homeNav = findRoute(rootState, Routes.ONBOARDING.HOME_NAV);
  if (!homeNav) {
    return { restore: false, reason: 'no_tree' };
  }

  const levels = homeNav.state ? collectReachableLevels(homeNav.state) : [];
  const innermost = levels[levels.length - 1];
  const focused =
    innermost?.routes[innermost.routes.length - 1]?.name ??
    Routes.ONBOARDING.HOME_NAV;

  if (lockedAt === null || now - lockedAt > restoreWindowMs) {
    return { restore: false, reason: 'window_expired', route: focused };
  }

  const allowlist =
    allowedRouteIds === RESTORABLE_ROUTES
      ? RESTORABLE_ROUTES_SET
      : new Set(allowedRouteIds);

  if (!pathTouchesAllowlist(levels, allowlist)) {
    return { restore: false, reason: 'not_restorable', route: focused };
  }

  return {
    restore: true,
    route: focused,
    target: focused,
    exact: true,
  };
};
