import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';

/**
 * Formats a number string with locale-appropriate separators
 * Uses Intl.NumberFormat to respect user's locale (e.g., en-US uses commas, de-DE uses periods)
 * A keypad decimal override keeps editable currency values unambiguous when
 * its separator differs from the app locale.
 */
export const formatAmountWithLocaleSeparators = (
  value: string,
  decimalSeparatorOverride?: string | null,
): string => {
  if (!value || value === '0') return value;

  const inputDecimalSeparator =
    decimalSeparatorOverride && value.includes(decimalSeparatorOverride)
      ? decimalSeparatorOverride
      : value.includes('.')
        ? '.'
        : undefined;
  const decimalIndex = inputDecimalSeparator
    ? value.lastIndexOf(inputDecimalSeparator)
    : -1;
  const integerPart = decimalIndex >= 0 ? value.slice(0, decimalIndex) : value;
  const decimalPart =
    decimalIndex >= 0 ? value.slice(decimalIndex + 1) : undefined;
  const parsed = Number(
    decimalPart === undefined ? integerPart : `${integerPart}.${decimalPart}`,
  );
  if (isNaN(parsed)) return value;

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

    const integerFormatter = getIntlNumberFormatter(I18n.locale, {
      useGrouping: true,
      maximumFractionDigits: 0,
    });
    let formattedInteger = integerFormatter.format(integerValue);

    if (decimalPart === undefined && !decimalSeparatorOverride) {
      return formattedInteger;
    }

    // Extract the locale's decimal separator by formatting a known
    // number and reading the character between the two digits.
    // e.g. "1.1" (en-US) or "1,1" (de-DE)
    const decimalSeparator =
      decimalSeparatorOverride ??
      getIntlNumberFormatter(I18n.locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(1.1)[1] ??
      inputDecimalSeparator ??
      '.';
    const groupingSeparator = integerFormatter
      .formatToParts?.(integerValue)
      .find(({ type }) => type === 'group')?.value;

    if (groupingSeparator === decimalSeparator) {
      const safeGroupingSeparator = decimalSeparator === ',' ? '.' : ',';
      formattedInteger = formattedInteger
        .split(groupingSeparator)
        .join(safeGroupingSeparator);
    }

    if (decimalPart === undefined) {
      return formattedInteger;
    }

    return `${formattedInteger}${decimalSeparator}${decimalPart ?? ''}`;
  } catch (error) {
    console.error('Number formatting error:', error);
    return value;
  }
};
