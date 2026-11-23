import I18n from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';

/**
 * Formats a UK migration `endDate` for banner / sheet copy.
 *
 * Always uses UTC so an authored deadline like `2026-09-30T23:59:59.999Z`
 * renders as 30 Sep, not the next local calendar day in timezones ahead of UTC
 * (e.g. UK BST).
 */
export const formatUkMigrationDeadline = (
  deadline: Date,
  options: { includeYear?: boolean } = {},
): string =>
  getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
    day: 'numeric',
    ...(options.includeYear ? { year: 'numeric' as const } : {}),
    timeZone: 'UTC',
  }).format(deadline);
