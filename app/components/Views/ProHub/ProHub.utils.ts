import type { Subscription } from '@metamask/subscription-controller';
import I18n from '../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../util/intl';

/**
 * Whether a pending period-end cancellation can still be reversed.
 *
 * Resume stays available only while `cancelAtPeriodEnd` is set and
 * `currentPeriodEnd` is a valid timestamp still in the future. A missing or
 * past period end means uncancel would fail.
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
    subscription?.cancelAtPeriodEnd !== true ||
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
