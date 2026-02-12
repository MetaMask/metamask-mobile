import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';

export { formatCurrency } from '../../../../util/formatCurrency';

/**
 * Formats a minimum received amount, always rounding down to ensure users
 * never see a minimum higher than they might actually receive.
 */
export function formatMinimumReceived(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0';

  // Floor to 8 decimal places before formatting
  const flooredAmount = Math.floor(numAmount * 1e8) / 1e8;

  return getIntlNumberFormatter(I18n.locale, {
    maximumSignificantDigits: 8,
  }).format(flooredAmount);
}
