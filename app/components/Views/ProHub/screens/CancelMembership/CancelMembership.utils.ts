import type { NavigationState, PartialState } from '@react-navigation/native';
import {
  CANCELLATION_REASONS,
  CANCEL_TYPES,
  type CancellationReasonCode,
  type CancelType,
} from '@metamask/subscription-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { type CancelReason } from './CancelMembership.constants';

/**
 * Shuffles cancel reasons for display so option order does not bias answers.
 * Pins "Other" last. Does not mutate the input array.
 */
export const shuffleCancelReasons = (
  reasons: CancelReason[],
): CancelReason[] => {
  const shuffled = [...reasons];
  const other = shuffled.splice(
    shuffled.findIndex((reason) => reason.id === CANCELLATION_REASONS.OTHER),
    1,
  );

  for (let i = shuffled.length - 1; i > 0; i--) {
    // Display-order randomization only — no security or fairness guarantee needed.
    const j = Math.floor(Math.random() * (i + 1)); // NOSONAR
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return [...shuffled, ...other];
};

export const CANCELLATION_TIMINGS = {
  IMMEDIATE: 'immediate',
  PERIOD_END: 'period_end',
} as const;

export type CancellationTiming =
  (typeof CANCELLATION_TIMINGS)[keyof typeof CANCELLATION_TIMINGS];

const CANCELLATION_REASON_CODES = new Set<string>(
  Object.values(CANCELLATION_REASONS),
);

/**
 * Maps a selected survey reason id to the Subscription API reason code.
 *
 * Undefined when the survey was skipped or the id is not a published code.
 */
export const toCancellationReason = (
  selectedReasonId: string | null,
): CancellationReasonCode | undefined => {
  if (
    selectedReasonId === null ||
    !CANCELLATION_REASON_CODES.has(selectedReasonId)
  ) {
    return undefined;
  }

  return selectedReasonId as CancellationReasonCode;
};

/**
 * Maps the server-provided cancellation capability to the request timing.
 *
 * Undefined means cancellation is currently unavailable and no request should
 * be sent.
 */
export const getCancellationTiming = (
  cancelType: CancelType | undefined,
): CancellationTiming | undefined => {
  if (cancelType === CANCEL_TYPES.ALLOWED_IMMEDIATE) {
    return CANCELLATION_TIMINGS.IMMEDIATE;
  }

  if (cancelType === CANCEL_TYPES.ALLOWED_AT_PERIOD_END) {
    return CANCELLATION_TIMINGS.PERIOD_END;
  }

  return undefined;
};

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
 * Keeps every screen that is not part of the Pro / Join Pro flow, in order.
 *
 * Preserved routes keep nested `state` and `params`. HomeNav is a tab
 * navigator; dropping its nested state would remount it on the initial Wallet
 * tab instead of the Money (or other) tab that started the flow.
 *
 * If every route is a Pro / Join Pro screen, HomeNav is used as the safe
 * origin.
 */
const getPostCancellationOriginRoutes = (
  state: NavigationState,
): NonNullable<PartialState<NavigationState>['routes']> => {
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

  // A Pro-only stack (deep link, prior reset) would leave nothing underneath.
  // HomeNav is the app's safe root so back is never a dead end.
  return preservedRoutes.length > 0
    ? preservedRoutes
    : [{ name: Routes.ONBOARDING.HOME_NAV }];
};

/**
 * Builds the stack shown after a period-end cancellation.
 *
 * Every Pro / Join Pro screen is removed and Pro Hub is placed on top of the
 * screen that started the flow. The membership is still active until the
 * period ends, so Pro Hub stays open.
 */
export const buildPostCancellationResetState = (
  state: NavigationState,
): PartialState<NavigationState> => {
  const routes = [
    ...getPostCancellationOriginRoutes(state),
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

/**
 * Builds the stack shown after an immediate cancellation.
 *
 * Benefits have ended, so Pro Hub is not in the stack. The origin screen is
 * dropped too: a fresh HomeNav mounts Main on Home and the home tabs on
 * Wallet. Keeping HomeNav's nested state would reopen Money or Accounts.
 */
export const buildPostCancellationHomeResetState =
  (): PartialState<NavigationState> => ({
    index: 0,
    routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
  });
