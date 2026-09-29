import I18n from '../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../util/intl';

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
