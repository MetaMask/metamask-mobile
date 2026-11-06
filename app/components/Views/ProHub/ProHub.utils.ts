import {
  INVOICE_PAYMENT_STATUSES,
  SUBSCRIPTION_STATUSES,
  type Subscription,
  type SubscriptionStatus,
} from '@metamask/subscription-controller';
import I18n from '../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../util/intl';

/**
 * Statuses that can still be uncancelled. A payment problem keeps its own
 * status and add-funds action, so resume does not replace it.
 */
const RESUMABLE_SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  SUBSCRIPTION_STATUSES.active,
  SUBSCRIPTION_STATUSES.trialing,
]);

/**
 * Whether a pending period-end cancellation can still be reversed.
 *
 * Resume stays available only for an active or trialing plan whose latest
 * invoice has not failed, while `cancelAtPeriodEnd` is set and
 * `currentPeriodEnd` is a valid timestamp still in the future. Past due,
 * paused, unpaid, and awaiting-funds plans keep their payment state. A
 * missing or past period end means uncancel would fail.
 *
 * @param subscription - Money Account Plus subscription, when one exists.
 * @param now - Clock used to compare `currentPeriodEnd`.
 * @returns True when the membership row should offer resume.
 */
export const canResumeMembership = (
  subscription: Subscription | undefined,
  now: Date = new Date(),
): boolean => {
  if (
    !subscription ||
    subscription.cancelAtPeriodEnd !== true ||
    !RESUMABLE_SUBSCRIPTION_STATUSES.has(subscription.status) ||
    subscription.lastInvoice?.status === INVOICE_PAYMENT_STATUSES.FAILED ||
    !subscription.currentPeriodEnd
  ) {
    return false;
  }

  const periodEnd = new Date(subscription.currentPeriodEnd);
  if (Number.isNaN(periodEnd.getTime())) {
    return false;
  }

  return periodEnd.getTime() > now.getTime();
};

export const MembershipManageAction = {
  Resume: 'resume',
  Cancel: 'cancel',
  Hidden: 'hidden',
} as const;

export type MembershipManageAction =
  (typeof MembershipManageAction)[keyof typeof MembershipManageAction];

/**
 * Which manage row the Membership screen should show.
 *
 * Resume while a period-end cancellation can still be reversed. Hide the row
 * once that window has closed. Otherwise offer cancel.
 *
 * @param subscription - Money Account Plus subscription, when one exists.
 * @param now - Clock used to compare `currentPeriodEnd`.
 * @returns The manage-row action for this subscription.
 */
export const getMembershipManageAction = (
  subscription: Subscription | undefined,
  now: Date = new Date(),
): MembershipManageAction => {
  if (canResumeMembership(subscription, now)) {
    return MembershipManageAction.Resume;
  }

  if (subscription?.cancelAtPeriodEnd === true) {
    return MembershipManageAction.Hidden;
  }

  return MembershipManageAction.Cancel;
};

/**
 * Formats a subscription period end in the app language and device timezone.
 *
 * @param currentPeriodEnd - ISO 8601 timestamp from the Plus subscription.
 * @returns e.g. `Jul 20, 2027`, or undefined when missing or unparseable.
 */
export const formatSubscriptionPeriodEnd = (
  currentPeriodEnd: string | undefined,
): string | undefined => {
  if (!currentPeriodEnd) {
    return undefined;
  }

  const date = new Date(currentPeriodEnd);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};
