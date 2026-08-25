import type { NavigationState, PartialState } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

export const POST_CANCELLATION_PRO_HUB_SOURCE =
  'pro_subscription_cancellation_success' as const;

const PRO_FLOW_ROUTE_NAMES = new Set<string>([
  Routes.PRO_SUBSCRIPTION.ROOT,
  Routes.PRO_HUB.ROOT,
  Routes.PRO_HUB.MEMBERSHIP,
  Routes.PRO_HUB.EARNED,
  Routes.PRO_HUB.CANCEL_MEMBERSHIP,
]);

/**
 * Builds the stack shown after the user taps Done on cancel-membership success.
 *
 * Pro Hub is on top. Every Pro / Join Pro screen is removed so Header back
 * returns to whatever screen started the flow (Money, Wallet, etc.) — not the
 * success step, Membership, or the Join Pro benefits modal.
 *
 * Preserved routes keep nested `state` and `params`. HomeNav is a tab
 * navigator; dropping its nested state would remount it on the initial Wallet
 * tab instead of the Money (or other) tab that started the flow.
 */
export const buildPostCancellationResetState = (
  state: NavigationState,
): PartialState<NavigationState> => {
  const preservedRoutes = state.routes
    .filter((route) => !PRO_FLOW_ROUTE_NAMES.has(route.name))
    .map(({ key, name, params, state: nestedState }) => ({
      key,
      name,
      ...(params !== undefined ? { params } : {}),
      // NavigationState uses `stale: false`; PartialState uses `stale?: true`.
      // Reset accepts the live nested tree at runtime (needed to restore HomeNav).
      ...(nestedState !== undefined
        ? { state: nestedState as PartialState<NavigationState> }
        : {}),
    }));

  const routes = [
    ...preservedRoutes,
    {
      name: Routes.PRO_HUB.ROOT,
      params: { source: POST_CANCELLATION_PRO_HUB_SOURCE },
    },
  ];

  return {
    index: routes.length - 1,
    routes,
  };
};
