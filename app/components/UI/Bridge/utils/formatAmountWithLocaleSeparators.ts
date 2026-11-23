import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';

interface AmountParts {
  integerPart: string;
  decimalPart?: string;
}

const getInputDecimalSeparator = (
  value: string,
  decimalSeparatorOverride?: string | null,
): string | undefined => {
  if (decimalSeparatorOverride && value.includes(decimalSeparatorOverride)) {
    return decimalSeparatorOverride;
  }

  if (value.includes('.')) {
    return '.';
  }

  return undefined;
};

const splitAmount = (value: string, decimalSeparator?: string): AmountParts => {
  if (!decimalSeparator) {
    return { integerPart: value };
  }

  const decimalIndex = value.lastIndexOf(decimalSeparator);
  if (decimalIndex < 0) {
    return { integerPart: value };
  }

  return {
    integerPart: value.slice(0, decimalIndex),
    decimalPart: value.slice(decimalIndex + 1),
  };
};

const getParsedAmount = ({ integerPart, decimalPart }: AmountParts): number => {
  const normalizedAmount =
    decimalPart === undefined ? integerPart : `${integerPart}.${decimalPart}`;
  return Number(normalizedAmount);
};

const getIntegerValue = (integerPart: string, parsedAmount: number): number => {
  const sanitizedInteger = (integerPart || '0').replace(/^\+/, '');
  return /^-?\d+$/.test(sanitizedInteger)
    ? parseInt(sanitizedInteger, 10)
    : Math.trunc(parsedAmount);
};

const getDecimalSeparator = (
  decimalSeparatorOverride: string | null | undefined,
  inputDecimalSeparator: string | undefined,
): string => {
  if (decimalSeparatorOverride) {
    return decimalSeparatorOverride;
  }

  const localeDecimalSeparator = getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(1.1)[1];

  return localeDecimalSeparator ?? inputDecimalSeparator ?? '.';
};

const replaceConflictingGroupingSeparator = (
  formattedInteger: string,
  integerFormatter: Intl.NumberFormat,
  integerValue: number,
  decimalSeparator: string,
): string => {
  const groupingSeparator = integerFormatter
    .formatToParts?.(integerValue)
    .find(({ type }) => type === 'group')?.value;

  if (!groupingSeparator || groupingSeparator !== decimalSeparator) {
    return formattedInteger;
  }

  const safeGroupingSeparator = decimalSeparator === ',' ? '.' : ',';
  return formattedInteger.split(groupingSeparator).join(safeGroupingSeparator);
};

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

  const inputDecimalSeparator = getInputDecimalSeparator(
    value,
    decimalSeparatorOverride,
  );
  const amountParts = splitAmount(value, inputDecimalSeparator);
  const parsedAmount = getParsedAmount(amountParts);
  if (Number.isNaN(parsedAmount)) return value;

  try {
    // Format only the integer part with locale grouping to avoid
    // float precision loss from Intl.NumberFormat.format() on
    // high-decimal-place values (e.g. 18-decimal ERC-20 tokens).
    // parseInt is safe here: the integer part alone is always small
    // enough for float64 to represent exactly.
    const integerValue = getIntegerValue(amountParts.integerPart, parsedAmount);
    const integerFormatter = getIntlNumberFormatter(I18n.locale, {
      useGrouping: true,
      maximumFractionDigits: 0,
    });
    const formattedInteger = integerFormatter.format(integerValue);

    if (amountParts.decimalPart === undefined && !decimalSeparatorOverride) {
      return formattedInteger;
    }

    const decimalSeparator = getDecimalSeparator(
      decimalSeparatorOverride,
      inputDecimalSeparator,
    );
    const safeFormattedInteger = replaceConflictingGroupingSeparator(
      formattedInteger,
      integerFormatter,
      integerValue,
      decimalSeparator,
    );

    if (amountParts.decimalPart === undefined) {
      return safeFormattedInteger;
    }

    return `${safeFormattedInteger}${decimalSeparator}${amountParts.decimalPart}`;
  } catch (error) {
    console.error('Number formatting error:', error);
    return value;
  }
};
