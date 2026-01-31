import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';

/**
 * Formats a number string with locale-appropriate separators
 * Uses Intl.NumberFormat to respect user's locale (e.g., en-US uses commas, de-DE uses periods)
 */
export const formatAmountWithLocaleSeparators = (value: string): string => {
  if (!value || value === '0') return value;

  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) return value;

  // Determine the number of decimal places in the original value
  const decimalPlaces = value.includes('.')
    ? value.split('.')[1]?.length || 0
    : 0;

  try {
    // Format with locale-appropriate separators using user's locale
    const formatted = getIntlNumberFormatter(I18n.locale, {
      useGrouping: true,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(numericValue);

    return formatted;
  } catch (error) {
    // Fallback to simple comma formatting if Intl fails
    console.error('Number formatting error:', error);
    return value;
  }
};
