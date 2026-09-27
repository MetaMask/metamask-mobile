import type { NavigationState, PartialState } from '@react-navigation/native';
import {
  CANCELLATION_REASONS,
  CANCEL_TYPES,
  type CancellationReasonCode,
  type CancelType,
} from '@metamask/subscription-controller';
import Routes from '../../../../../constants/navigation/Routes';
import {
  OTHER_REASON_ID,
  type CancelReason,
} from './CancelMembership.constants';

/**
 * Shuffles cancel reasons for display so option order does not bias answers.
 * Pins "Other" last. Does not mutate the input array.
 */
export const shuffleCancelReasons = (
  reasons: CancelReason[],
): CancelReason[] => {
  const shuffled = [...reasons];
  const other = shuffled.splice(
    shuffled.findIndex((reason) => reason.id === OTHER_REASON_ID),
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
  cancelType: CancelType,
): CancellationTiming | undefined => {
  if (cancelType === CANCEL_TYPES.ALLOWED_IMMEDIATE) {
    return CANCELLATION_TIMINGS.IMMEDIATE;
  }

  if (cancelType === CANCEL_TYPES.ALLOWED_AT_PERIOD_END) {
    return CANCELLATION_TIMINGS.PERIOD_END;
  }

  return undefined;
};

/**
 * Formats the subscription period end for cancellation confirmation copy.
 */
export const formatCancellationEndDate = (currentPeriodEnd: string): string => {
  const date = new Date(currentPeriodEnd);

  if (Number.isNaN(date.getTime())) {
    return currentPeriodEnd;
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
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
 * Builds the stack shown after the user taps Done on cancel-membership success.
 *
 * Every Pro / Join Pro screen is removed. Pro Hub is restored only when the
 * period-end cancellation preserves access; immediate cancellation returns
 * directly to the screen that started the flow.
 *
 * Preserved routes keep nested `state` and `params`. HomeNav is a tab
 * navigator; dropping its nested state would remount it on the initial Wallet
 * tab instead of the Money (or other) tab that started the flow.
 *
 * If every route is a Pro / Join Pro screen, HomeNav is inserted as the safe
 * origin (and as the destination for immediate cancellation).
 */
export const buildPostCancellationResetState = (
  state: NavigationState,
  shouldReturnToProHub = true,
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

  // A Pro-only stack (deep link, prior reset) would leave Pro Hub with
  // nothing underneath. HomeNav is the app's safe root so Header back
  // is never a dead end.
  const originRoutes =
    preservedRoutes.length > 0
      ? preservedRoutes
      : [{ name: Routes.ONBOARDING.HOME_NAV }];

  const routes = shouldReturnToProHub
    ? [
        ...originRoutes,
        {
          name: Routes.PRO_HUB.ROOT,
          params: { source: POST_CANCELLATION_PRO_HUB_SOURCE },
        },
      ]
    : originRoutes;

  return {
    index: routes.length - 1,
    routes,
  };
};
