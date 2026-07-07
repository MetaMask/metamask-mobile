import { MINIMUM_DISPLAY_THRESHOLD } from '../../../../../../../util/number/bigint';
import { formatSubscriptNotation } from '../../../../../../../util/number/subscriptNotation';
import { getIntlNumberFormatter } from '../../../../../../../util/intl';
import I18n from '../../../../../../../../locales/i18n';

export type QuickBuyRateIntlOptions = Pick<
  Intl.NumberFormatOptions,
  | 'minimumFractionDigits'
  | 'maximumFractionDigits'
  | 'minimumSignificantDigits'
  | 'maximumSignificantDigits'
>;

/**
 * Formats the numeric portion of a Quick Buy exchange rate.
 * Uses subscript notation for very small rates (matching asset prices),
 * while preserving the dust threshold display for sub-micro values.
 */
export function formatQuickBuyRateValue(
  rate: number,
  intlOptions: QuickBuyRateIntlOptions,
  locale: string = I18n.locale,
): string {
  if (rate >= MINIMUM_DISPLAY_THRESHOLD) {
    const subscript = formatSubscriptNotation(rate);
    if (subscript) {
      return subscript;
    }
  }

  return getIntlNumberFormatter(locale, intlOptions).format(rate);
}
