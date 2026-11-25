import {
  CANCEL_TYPES,
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
 * Whether the membership period has already reached its end date.
 *
 * `currentPeriodEnd` is the exclusive renewal instant, so the period has
 * ended once `now` reaches it. Any status can be past its end date, for
 * example a past-due, paused, or unpaid plan that never renewed.
 *
 * @param subscription - Money Account Plus subscription, when one exists.
 * @param now - Clock used to compare `currentPeriodEnd`.
 * @returns True when `currentPeriodEnd` is set and is not after `now`.
 */
export const isMembershipPeriodEnded = (
  subscription: Subscription | undefined,
  now: Date = new Date(),
): boolean => {
  const periodEnd = subscription?.currentPeriodEnd;
  if (!periodEnd) {
    return false;
  }

  const parsedPeriodEnd = new Date(periodEnd);
  if (Number.isNaN(parsedPeriodEnd.getTime())) {
    return false;
  }

  return parsedPeriodEnd.getTime() <= now.getTime();
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
  CancelBlocked: 'cancel_blocked',
  Hidden: 'hidden',
} as const;

/**
 * Whether the server currently refuses cancellation for this membership.
 *
 * `not_allowed` and `not_allowed_pending_verification` both mean the Cancel
 * action cannot be sent, so the row is shown disabled instead.
 *
 * @param subscription - Money Account Plus subscription, when one exists.
 * @returns True when cancellation is blocked.
 */
export const isCancelBlocked = (
  subscription: Subscription | undefined,
): boolean =>
  subscription?.cancelType === CANCEL_TYPES.NOT_ALLOWED ||
  subscription?.cancelType === CANCEL_TYPES.NOT_ALLOWED_PENDING_VERIFICATION;

export type MembershipManageAction =
  (typeof MembershipManageAction)[keyof typeof MembershipManageAction];

/**
 * Which manage row the Membership screen should show.
 *
 * Resume while a period-end cancellation can still be reversed. Hide the row
 * once that window has closed, and while a payment problem blocks resume.
 * When the server refuses cancellation, show the Cancel row disabled.
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

  if (isCancelBlocked(subscription)) {
    return MembershipManageAction.CancelBlocked;
  }

  return MembershipManageAction.Cancel;
};

export interface FormatSubscriptionPeriodEndOptions {
  /** App language. Defaults to the current locale. */
  locale?: string;
  /**
   * Defaults to true, which shows the last day of access. Use this for
   * end-of-access wording ("Ends on", "Ended on", "Resume before"). Pass false
   * for a renewal or reset, where `timestamp` is the charge day itself. A
   * timestamp that is not a period end, such as `canceledAt`, should also pass
   * false.
   */
  exclusivePeriodEnd?: boolean;
}

/**
 * Formats a subscription date as one UTC calendar day.
 *
 * `currentPeriodEnd` is the exclusive start of the next period. By default
 * this moves back one millisecond, so it shows the last day of access. A
 * renewal or reset must pass `exclusivePeriodEnd: false` to show the charge day.
 *
 * @param timestamp - ISO 8601 timestamp from the Plus subscription.
 * @param options - Locale and which day to show for the timestamp.
 * @returns e.g. `Jul 19, 2027` for `2027-07-20T00:00:00.000Z`, or `Jul 20, 2027` for `2027-07-20T12:00:00.000Z`. Undefined when missing or unparseable.
 */
export const formatSubscriptionPeriodEnd = (
  timestamp: string | undefined,
  options: FormatSubscriptionPeriodEndOptions = {},
): string | undefined => {
  if (!timestamp) {
    return undefined;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (options.exclusivePeriodEnd !== false) {
    date.setTime(date.getTime() - 1);
  }

  return getIntlDateTimeFormatter(options.locale ?? I18n.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};
