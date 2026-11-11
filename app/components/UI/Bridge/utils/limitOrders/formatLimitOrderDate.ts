import I18n from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';

const MISSING_DATE_VALUE = '--';

/**
 * Formats an ISO timestamp as a short absolute date, e.g. "Mar 12".
 *
 * @param timestamp - An ISO-8601 timestamp, e.g. a limit order's `filledAt`.
 * @returns The formatted date, or a placeholder when `timestamp` is missing
 * or unparsable.
 */
export function formatLimitOrderDate(timestamp: string | undefined): string {
  if (!timestamp) {
    return MISSING_DATE_VALUE;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return MISSING_DATE_VALUE;
  }

  return getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}
