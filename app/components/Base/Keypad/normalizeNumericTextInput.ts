export const DEFAULT_MAX_NUMERIC_INPUT_DIGITS = 9;

export interface NormalizeNumericTextInputOptions {
  /** Maximum number of digits across the integer and fractional parts. */
  maxDigits?: number;
  /** Maximum number of digits after the decimal separator. */
  maxDecimalPlaces?: number;
  /** Single-character separator accepted by the input. */
  decimalSeparator?: string;
}

export interface NormalizeNumericTextInputResult {
  value: string;
  ok: boolean;
}

const isNonNegativeInteger = (value: number) =>
  Number.isInteger(value) && value >= 0;

/**
 * Normalizes a complete native numeric-input edit while preserving editable
 * states such as an empty value and a trailing decimal separator.
 *
 * Invalid edits return the previous value so controlled inputs never expose
 * malformed or over-limit text.
 *
 * @param text - Full text emitted by the native input.
 * @param previousValue - Last accepted input value.
 * @param options - Digit, decimal-place, and separator constraints.
 * @returns The normalized value and whether the edit was accepted.
 */
export const normalizeNumericTextInput = (
  text: string,
  previousValue: string,
  {
    maxDigits = DEFAULT_MAX_NUMERIC_INPUT_DIGITS,
    maxDecimalPlaces,
    decimalSeparator = '.',
  }: NormalizeNumericTextInputOptions = {},
): NormalizeNumericTextInputResult => {
  if (
    decimalSeparator.length !== 1 ||
    /\d/.test(decimalSeparator) ||
    !isNonNegativeInteger(maxDigits) ||
    (maxDecimalPlaces !== undefined && !isNonNegativeInteger(maxDecimalPlaces))
  ) {
    return { value: previousValue, ok: false };
  }

  if (text === '') {
    return { value: '', ok: true };
  }

  let integerPart = '';
  let fractionalPart = '';
  let hasDecimalSeparator = false;

  for (const character of text) {
    if (/\d/.test(character)) {
      if (hasDecimalSeparator) {
        fractionalPart += character;
      } else {
        integerPart += character;
      }
      continue;
    }

    if (character === decimalSeparator) {
      if (!hasDecimalSeparator) {
        hasDecimalSeparator = true;
      }
      continue;
    }

    return { value: previousValue, ok: false };
  }

  if (!integerPart && !fractionalPart && !hasDecimalSeparator) {
    return { value: previousValue, ok: false };
  }

  const normalizedIntegerPart = integerPart.replace(/^0+(?=\d)/, '') || '0';

  if (
    normalizedIntegerPart.length + fractionalPart.length > maxDigits ||
    (maxDecimalPlaces !== undefined &&
      fractionalPart.length > maxDecimalPlaces) ||
    (maxDecimalPlaces === 0 && hasDecimalSeparator)
  ) {
    return { value: previousValue, ok: false };
  }

  const value = hasDecimalSeparator
    ? `${normalizedIntegerPart}${decimalSeparator}${fractionalPart}`
    : normalizedIntegerPart;

  return { value, ok: true };
};

/**
 * Removes a trailing decimal separator when input editing ends.
 *
 * @param value - Last accepted numeric input value.
 * @param decimalSeparator - Single-character decimal separator.
 * @returns A finalized numeric value; empty input remains empty.
 */
export const finalizeNumericTextInput = (
  value: string,
  decimalSeparator = '.',
): string =>
  value.endsWith(decimalSeparator)
    ? value.slice(0, -decimalSeparator.length)
    : value;
