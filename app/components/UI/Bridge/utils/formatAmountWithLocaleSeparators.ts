import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';

/**
 * Formats a number string with locale-appropriate separators
 * Uses Intl.NumberFormat to respect user's locale (e.g., en-US uses commas, de-DE uses periods)
 */
export const formatAmountWithLocaleSeparators = (value: string): string => {
  if (!value || value === '0') return value;

  const parsed = parseFloat(value);
  if (isNaN(parsed)) return value;

  const [integerPart, decimalPart] = value.split('.');
  const sanitizedInt = (integerPart || '0').replace(/^\+/, '');

  try {
    // Format only the integer part with locale grouping to avoid
    // float precision loss from Intl.NumberFormat.format() on
    // high-decimal-place values (e.g. 18-decimal ERC-20 tokens).
    // parseInt is safe here: the integer part alone is always small
    // enough for float64 to represent exactly.
    const integerValue = /^-?\d+$/.test(sanitizedInt)
      ? parseInt(sanitizedInt, 10)
      : Math.trunc(parsed);

    const formattedInteger = getIntlNumberFormatter(I18n.locale, {
      useGrouping: true,
      maximumFractionDigits: 0,
    }).format(integerValue);

    if (decimalPart === undefined && !value.includes('.')) {
      return formattedInteger;
    }

    // Extract the locale's decimal separator by formatting a known
    // number and reading the character between the two digits.
    // e.g. "1.1" (en-US) or "1,1" (de-DE)
    const sample = getIntlNumberFormatter(I18n.locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(1.1);
    const decimalSeparator = sample[1] ?? '.';

    return `${formattedInteger}${decimalSeparator}${decimalPart ?? ''}`;
  } catch (error) {
    console.error('Number formatting error:', error);
    return value;
  }
};
