import {
  INVOICE_PAYMENT_STATUSES,
  type Subscription,
} from '@metamask/subscription-controller';
import I18n from '../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../util/intl';
import { isConfirmedSubscriptionStatus } from '../../../util/subscription/moneyAccountPlusStatus';

/**
 * Whether a period-end cancellation is still inside its end date.
 *
 * This is the date-row check. It does not ask whether Resume is offered, so
 * a past-due, paused, unpaid, or awaiting-funds plan that is still scheduled
 * to end keeps "Ends on".
 *
 * @param subscription - Money Account Plus subscription, when one exists.
 * @param now - Clock used to compare `currentPeriodEnd`.
 * @returns True when `cancelAtPeriodEnd` is set and the period end is ahead.
 */
export const isPeriodEndCancellationPending = (
  subscription: Subscription | undefined,
  now: Date = new Date(),
): boolean => {
  const periodEnd = subscription?.currentPeriodEnd;
  if (subscription?.cancelAtPeriodEnd !== true || !periodEnd) {
    return false;
  }

  const parsedPeriodEnd = new Date(periodEnd);
  if (Number.isNaN(parsedPeriodEnd.getTime())) {
    return false;
  }

  return parsedPeriodEnd.getTime() > now.getTime();
};

/**
 * Whether a pending period-end cancellation can still be reversed.
 *
 * Resume stays available only for an active or trialing plan whose latest
 * invoice has not failed, while the period-end cancellation is still open.
 * Past due, paused, unpaid, and awaiting-funds plans keep their payment
 * state. A missing or past period end means uncancel would fail.
 *
 * @param subscription - Money Account Plus subscription, when one exists.
 * @param now - Clock used to compare `currentPeriodEnd`.
 * @returns True when the membership row should offer resume.
 */
export const canResumeMembership = (
  subscription: Subscription | undefined,
  now: Date = new Date(),
): boolean => {
  if (!subscription) {
    return false;
  }

  if (
    !isConfirmedSubscriptionStatus(subscription.status) ||
    subscription.lastInvoice?.status === INVOICE_PAYMENT_STATUSES.FAILED
  ) {
    return false;
  }

  return isPeriodEndCancellationPending(subscription, now);
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
 * once that window has closed, and while a payment problem blocks resume.
 * Otherwise offer cancel.
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
