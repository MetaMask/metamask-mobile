import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from '@metamask/subscription-controller';
import Routes from '../../../../constants/navigation/Routes';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';

/**
 * How checkout finishes after `startSubscriptionWithDelegation` resolves.
 *
 * `ready` opens the success screen. That is the crypto path, where the Money
 * Account already held the funds. `processing` is an on-ramp or bridge top-up
 * that is still moving funds: the subscription stays provisional, so checkout
 * shows a toast and opens Pro Hub instead of the success screen.
 */
export const StartProSubscriptionOutcome = {
  Ready: 'ready',
  Processing: 'processing',
} as const;

export type StartProSubscriptionOutcome =
  (typeof StartProSubscriptionOutcome)[keyof typeof StartProSubscriptionOutcome];

/**
 * What a provisional Plus subscription did on the latest refresh.
 *
 * `pending` means funds are still moving. `activated` means the membership
 * is live. `failed` means the server gave up on the payment.
 */
export const ProvisionalPaymentTransition = {
  Pending: 'pending',
  Activated: 'activated',
  Failed: 'failed',
} as const;

export type ProvisionalPaymentTransition =
  (typeof ProvisionalPaymentTransition)[keyof typeof ProvisionalPaymentTransition];

/** Product-default refresh while a provisional membership is waiting on funds. */
export const PROVISIONAL_POLL_INTERVAL_MS = 15_000;

/** Slower refresh for a constrained device or a slow cellular link. */
export const PROVISIONAL_POLL_SLOW_INTERVAL_MS = 60_000;

const ACTIVATED_STATUSES = new Set<SubscriptionStatus>([
  SUBSCRIPTION_STATUSES.active,
  SUBSCRIPTION_STATUSES.trialing,
]);

const STILL_FUNDING_STATUSES = new Set<SubscriptionStatus>([
  SUBSCRIPTION_STATUSES.provisional,
  SUBSCRIPTION_STATUSES.awaitingFunds,
]);

/**
 * True for a funding status, whether or not this session started the checkout.
 *
 * `awaiting_funds` is also the long-lived low-balance state Pro Hub shows as
 * Active. Callers that announce a checkout must already have seen
 * `provisional` in this session before treating `awaiting_funds` as that
 * payment.
 *
 * @param status - Latest Plus status, or undefined when the plan is gone.
 * @returns Whether the status is provisional or awaiting funds.
 */
export function isStillFundingSubscriptionStatus(
  status: SubscriptionStatus | undefined,
): boolean {
  return status !== undefined && STILL_FUNDING_STATUSES.has(status);
}

/**
 * Chooses the post-checkout screen from how the membership was funded.
 *
 * A balance that was already sufficient is a crypto payment and opens the
 * success screen even if the returned status is still provisional. A top-up
 * opens the processing path only while the server is still waiting on funds.
 * A top-up that has already activated opens the success screen.
 *
 * @param fundedFromBalance - True when checkout did not need a top-up.
 * @param status - Status returned by the subscription start.
 * @returns Whether checkout should show success or keep waiting.
 */
export function resolveProSubscriptionStartOutcome(
  fundedFromBalance: boolean,
  status: SubscriptionStatus,
): StartProSubscriptionOutcome {
  if (fundedFromBalance) {
    return StartProSubscriptionOutcome.Ready;
  }

  if (STILL_FUNDING_STATUSES.has(status)) {
    return StartProSubscriptionOutcome.Processing;
  }

  return StartProSubscriptionOutcome.Ready;
}

/**
 * Classifies the status that followed a provisional Money Account Plus plan.
 *
 * Active and trialing are the success states. Provisional and awaiting-funds
 * are still in flight. Every other status, including a missing subscription,
 * is a failed payment: the server cancels the provisional plan when the
 * on-ramp or bridge never delivers the funds.
 *
 * @param status - Latest Plus status, or undefined when the plan is gone.
 * @returns The transition to announce, or pending when nothing is settled.
 */
export function resolveProvisionalPaymentTransition(
  status: SubscriptionStatus | undefined,
): ProvisionalPaymentTransition {
  if (status !== undefined && ACTIVATED_STATUSES.has(status)) {
    return ProvisionalPaymentTransition.Activated;
  }

  if (status !== undefined && STILL_FUNDING_STATUSES.has(status)) {
    return ProvisionalPaymentTransition.Pending;
  }

  return ProvisionalPaymentTransition.Failed;
}

const PRO_HUB_ROUTE_NAMES: ReadonlySet<string> = new Set(
  Object.values(Routes.PRO_HUB),
);

/**
 * The active-membership toast links to Pro Hub from every other screen.
 * On Pro Hub itself the user is already looking at the membership, so the
 * button stays hidden.
 *
 * @param routeName - Focused route name, or undefined when navigation is not ready.
 * @returns Whether the toast should offer the Pro Hub action.
 */
export function shouldShowActiveMembershipCta(
  routeName: string | undefined,
): boolean {
  if (routeName === undefined) {
    return true;
  }

  return !PRO_HUB_ROUTE_NAMES.has(routeName);
}

/**
 * How often to refresh subscriptions while a Plus plan is provisional.
 *
 * No usable network skips the extra poll. A known slow cellular link, or a
 * known low-memory device on a known network, polls once a minute. An
 * unknown network uses the 15 second product default, including on low-memory
 * hardware, because an unknown tier is not treated as offline or low-end.
 *
 * @param hardware - Device memory tier. Null means the tier is unknown.
 * @param network - Transport tier. Null means the tier is unknown.
 * @returns Interval in milliseconds, or false when the extra poll should stop.
 */
export function getProvisionalSubscriptionPollIntervalMs(
  hardware: HardwareTier | null,
  network: NetworkTier | null,
): number | false {
  if (network === 'NONE') {
    return false;
  }

  if (network === 'SLOW_CELLULAR') {
    return PROVISIONAL_POLL_SLOW_INTERVAL_MS;
  }

  if (network === null) {
    return PROVISIONAL_POLL_INTERVAL_MS;
  }

  if (hardware === 'LOW') {
    return PROVISIONAL_POLL_SLOW_INTERVAL_MS;
  }

  return PROVISIONAL_POLL_INTERVAL_MS;
}
