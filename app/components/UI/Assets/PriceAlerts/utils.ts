import { strings } from '../../../../../locales/i18n';
import { trimTrailingZeros } from '../../Bridge/utils/trimTrailingZeros';
import type { PercentChangeAlert } from './constants';

/** Formats the percent magnitude for display, e.g. `10` -> `"10"`, `10.5` -> `"10.5"`. */
const formatPercentValue = (threshold: number): string =>
  trimTrailingZeros(threshold.toFixed(2));

/**
 * Manage-screen row title for a percent-change alert, e.g. `"Moves up 10%"`.
 */
export const formatPercentAlertTitle = (alert: PercentChangeAlert): string =>
  strings(
    alert.direction === 'up'
      ? 'price_alerts.moves_up_summary'
      : 'price_alerts.moves_down_summary',
    { percent: formatPercentValue(alert.threshold) },
  );

/**
 * Manage-screen row subtitle for a percent-change alert, e.g. `"1h • Once"`.
 */
export const formatPercentAlertSubtitle = (alert: PercentChangeAlert): string =>
  strings('price_alerts.period_recurrence', {
    period: strings(`price_alerts.period_${alert.period}_short`),
    recurrence: strings(
      alert.recurring ? 'price_alerts.recurring' : 'price_alerts.once_label',
    ),
  });
