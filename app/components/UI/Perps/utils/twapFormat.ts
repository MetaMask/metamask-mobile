import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { PERPS_TWAP_UI_CONFIG } from '../constants/perpsConfig';

/**
 * Render a TWAP duration in minutes as a human phrase, e.g. `1 hr 30 min`.
 * Zero-valued units are dropped, so 90 reads `1 hr 30 min` and 60 reads `1 hr`.
 *
 * Shared by the placement toasts and the TWAP management card so both describe
 * the same schedule identically.
 */
export const formatTwapDuration = (durationMinutes: number): string => {
  const wholeMinutes = Math.max(0, Math.floor(durationMinutes));
  const minutesPerDay =
    PERPS_TWAP_UI_CONFIG.HoursPerDay * PERPS_TWAP_UI_CONFIG.MinutesPerHour;
  const days = Math.floor(wholeMinutes / minutesPerDay);
  const hours = Math.floor(
    (wholeMinutes % minutesPerDay) / PERPS_TWAP_UI_CONFIG.MinutesPerHour,
  );
  const minutes = wholeMinutes % PERPS_TWAP_UI_CONFIG.MinutesPerHour;

  // A schedule under a minute old has no non-zero unit to show. Fall back to
  // the smallest unit so callers rendering "elapsed / total" never emit a bare
  // separator.
  if (wholeMinutes === 0) {
    return strings('perps.order.twap_duration_minutes', { count: 0 });
  }

  return [
    days > 0
      ? strings(
          days === 1
            ? 'perps.order.twap_duration_day'
            : 'perps.order.twap_duration_days',
          { count: days },
        )
      : undefined,
    hours > 0
      ? strings(
          hours === 1
            ? 'perps.order.twap_duration_hour'
            : 'perps.order.twap_duration_hours',
          { count: hours },
        )
      : undefined,
    minutes > 0
      ? strings(
          minutes === 1
            ? 'perps.order.twap_duration_minute'
            : 'perps.order.twap_duration_minutes',
          { count: minutes },
        )
      : undefined,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ');
};

/**
 * Render basis points as a percent string, e.g. 2500 -> `25%`.
 * The controller reports TWAP fill and time progress in bps.
 */
export const formatTwapProgressPercent = (bps: number): string => {
  const clampedBps = Math.min(Math.max(bps, 0), 10000);
  return getIntlNumberFormatter(I18n.locale, {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format(clampedBps / 10000);
};
