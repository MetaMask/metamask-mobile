import {
  SUBSCRIPTION_STATUSES,
  type SubscriptionStatus,
} from '@metamask/subscription-controller';

/**
 * Statuses that grant subscription benefits. Mirrors Core's
 * `ACTIVE_SUBSCRIPTION_STATUSES`, which is not part of the package's public
 * exports.
 */
const ACTIVE_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set<SubscriptionStatus>([
    SUBSCRIPTION_STATUSES.active,
    SUBSCRIPTION_STATUSES.trialing,
    SUBSCRIPTION_STATUSES.provisional,
  ]);

/**
 * Statuses where payment has cleared. A checkout that reaches one of these
 * has activated, and a period-end cancel on one of these can be resumed.
 */
const CONFIRMED_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set<SubscriptionStatus>([
    SUBSCRIPTION_STATUSES.active,
    SUBSCRIPTION_STATUSES.trialing,
  ]);

/**
 * Statuses where funds are still moving. `awaiting_funds` is also the
 * long-lived low-balance state Pro Hub shows as Active.
 */
const FUNDING_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set<SubscriptionStatus>([
    SUBSCRIPTION_STATUSES.provisional,
    SUBSCRIPTION_STATUSES.awaitingFunds,
  ]);

/** Statuses Pro Hub shows as Deactivated. Benefits are off, usage remains. */
const DEACTIVATED_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set<SubscriptionStatus>([
    SUBSCRIPTION_STATUSES.paused,
    SUBSCRIPTION_STATUSES.unpaid,
  ]);

/**
 * Statuses under which the user still holds a subscription they can manage.
 * Extends the active set with `paused`, which grants no benefits but must
 * still reach Pro Hub so the user can fix the payment problem or cancel.
 */
const MANAGEABLE_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set<SubscriptionStatus>([
    ...ACTIVE_SUBSCRIPTION_STATUSES,
    SUBSCRIPTION_STATUSES.paused,
  ]);

/**
 * Plus statuses Pro Hub can render. Matches `getMembershipBannerModel`:
 * active, trialing, provisional, and awaiting funds show Active; past due
 * shows Overdue; paused and unpaid show Deactivated. Canceled, incomplete,
 * and incomplete-expired stay on the join label and Benefits.
 */
const HUB_MEMBERSHIP_SUBSCRIPTION_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set<SubscriptionStatus>([
    ...ACTIVE_SUBSCRIPTION_STATUSES,
    ...DEACTIVATED_SUBSCRIPTION_STATUSES,
    SUBSCRIPTION_STATUSES.awaitingFunds,
    SUBSCRIPTION_STATUSES.pastDue,
  ]);

const hasStatus = (
  statuses: ReadonlySet<SubscriptionStatus>,
  status: SubscriptionStatus | undefined,
): boolean => status !== undefined && statuses.has(status);

/**
 * @param status - Plus status, or undefined when there is no plan.
 * @returns Whether the status grants subscription benefits.
 */
export const isActiveSubscriptionStatus = (
  status: SubscriptionStatus | undefined,
): boolean => hasStatus(ACTIVE_SUBSCRIPTION_STATUSES, status);

/**
 * @param status - Plus status, or undefined when there is no plan.
 * @returns Whether payment has cleared (active or trialing).
 */
export const isConfirmedSubscriptionStatus = (
  status: SubscriptionStatus | undefined,
): boolean => hasStatus(CONFIRMED_SUBSCRIPTION_STATUSES, status);

/**
 * Callers that announce a checkout must already know this session started
 * it before treating `awaiting_funds` as that payment.
 *
 * @param status - Plus status, or undefined when there is no plan.
 * @returns Whether the status is provisional or awaiting funds.
 */
export const isFundingSubscriptionStatus = (
  status: SubscriptionStatus | undefined,
): boolean => hasStatus(FUNDING_SUBSCRIPTION_STATUSES, status);

/**
 * @param status - Plus status, or undefined when there is no plan.
 * @returns Whether the status is paused or unpaid.
 */
export const isDeactivatedSubscriptionStatus = (
  status: SubscriptionStatus | undefined,
): boolean => hasStatus(DEACTIVATED_SUBSCRIPTION_STATUSES, status);

/**
 * @param status - Plus status, or undefined when there is no plan.
 * @returns Whether the user still holds a subscription they can manage.
 */
export const isManageableSubscriptionStatus = (
  status: SubscriptionStatus | undefined,
): boolean => hasStatus(MANAGEABLE_SUBSCRIPTION_STATUSES, status);

/**
 * @param status - Plus status, or undefined when there is no plan.
 * @returns Whether the Orange row labels the membership and opens Pro Hub.
 */
export const isHubMembershipSubscriptionStatus = (
  status: SubscriptionStatus | undefined,
): boolean => hasStatus(HUB_MEMBERSHIP_SUBSCRIPTION_STATUSES, status);

/**
 * Which trade-benefit data a Plus status can show.
 *
 * `granted` reads the controller snapshot. `paused` reads current-period
 * usage from SubscriptionService with the waiver off. `none` has no usage to
 * show: core clears benefits for `past_due`, `awaiting_funds`, and every
 * status outside the active set.
 */
export const MembershipBenefitsMode = {
  Granted: 'granted',
  Paused: 'paused',
  None: 'none',
} as const;

export type MembershipBenefitsMode =
  (typeof MembershipBenefitsMode)[keyof typeof MembershipBenefitsMode];

/**
 * @param status - Plus status, or undefined when there is no plan.
 * @returns The benefits data this status can show.
 */
export const getMembershipBenefitsMode = (
  status: SubscriptionStatus | undefined,
): MembershipBenefitsMode => {
  if (isActiveSubscriptionStatus(status)) {
    return MembershipBenefitsMode.Granted;
  }
  if (isDeactivatedSubscriptionStatus(status)) {
    return MembershipBenefitsMode.Paused;
  }
  return MembershipBenefitsMode.None;
};
