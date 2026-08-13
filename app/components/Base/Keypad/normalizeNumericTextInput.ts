export const DEFAULT_MAX_NUMERIC_INPUT_DIGITS = 9;

export interface NormalizeNumericTextInputOptions {
  /** Maximum number of digits across the integer and fractional parts. */
  maxDigits?: number;
  /** Maximum number of digits after the decimal separator. */
  maxDecimalPlaces?: number;
  /** Canonical single-character separator used in the normalized output. */
  decimalSeparator?: string;
  /** Single-character separators accepted from the native input. */
  acceptedDecimalSeparators?: readonly string[];
}

export interface NormalizeNumericTextInputResult {
  value: string;
  ok: boolean;
}

interface ParsedNumericTextParts {
  integerPart: string;
  fractionalPart: string;
  hasDecimalSeparator: boolean;
}

const isNonNegativeInteger = (value: number) =>
  Number.isInteger(value) && value >= 0;

const areNormalizeOptionsValid = ({
  maxDigits,
  maxDecimalPlaces,
  decimalSeparator,
  acceptedDecimalSeparators,
}: {
  maxDigits: number;
  maxDecimalPlaces?: number;
  decimalSeparator: string;
  acceptedDecimalSeparators: readonly string[];
}): boolean =>
  decimalSeparator.length === 1 &&
  !/\d/.test(decimalSeparator) &&
  acceptedDecimalSeparators.length > 0 &&
  acceptedDecimalSeparators.every(
    (separator) => separator.length === 1 && !/\d/.test(separator),
  ) &&
  isNonNegativeInteger(maxDigits) &&
  (maxDecimalPlaces === undefined || isNonNegativeInteger(maxDecimalPlaces));

const parseNumericTextParts = (
  text: string,
  acceptedDecimalSeparators: readonly string[],
): ParsedNumericTextParts | null => {
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

    if (acceptedDecimalSeparators.includes(character)) {
      if (hasDecimalSeparator) {
        return null;
      }
      hasDecimalSeparator = true;
      continue;
    }

    return null;
  }

  if (!integerPart && !fractionalPart && !hasDecimalSeparator) {
    return null;
  }

  return { integerPart, fractionalPart, hasDecimalSeparator };
};

const exceedsNumericLimits = ({
  normalizedIntegerPart,
  fractionalPart,
  hasDecimalSeparator,
  maxDigits,
  maxDecimalPlaces,
}: {
  normalizedIntegerPart: string;
  fractionalPart: string;
  hasDecimalSeparator: boolean;
  maxDigits: number;
  maxDecimalPlaces?: number;
}): boolean =>
  normalizedIntegerPart.length + fractionalPart.length > maxDigits ||
  (maxDecimalPlaces !== undefined &&
    fractionalPart.length > maxDecimalPlaces) ||
  (maxDecimalPlaces === 0 && hasDecimalSeparator);

const formatNormalizedNumericValue = ({
  normalizedIntegerPart,
  fractionalPart,
  hasDecimalSeparator,
  decimalSeparator,
}: {
  normalizedIntegerPart: string;
  fractionalPart: string;
  hasDecimalSeparator: boolean;
  decimalSeparator: string;
}): string =>
  hasDecimalSeparator
    ? `${normalizedIntegerPart}${decimalSeparator}${fractionalPart}`
    : normalizedIntegerPart;

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
    acceptedDecimalSeparators = [decimalSeparator],
  }: NormalizeNumericTextInputOptions = {},
): NormalizeNumericTextInputResult => {
  if (
    !areNormalizeOptionsValid({
      maxDigits,
      maxDecimalPlaces,
      decimalSeparator,
      acceptedDecimalSeparators,
    })
  ) {
    return { value: previousValue, ok: false };
  }

  if (text === '') {
    return { value: '', ok: true };
  }

  const parsed = parseNumericTextParts(text, acceptedDecimalSeparators);
  if (!parsed) {
    return { value: previousValue, ok: false };
  }

  const normalizedIntegerPart =
    parsed.integerPart.replace(/^0+(?=\d)/, '') || '0';

  if (
    exceedsNumericLimits({
      normalizedIntegerPart,
      fractionalPart: parsed.fractionalPart,
      hasDecimalSeparator: parsed.hasDecimalSeparator,
      maxDigits,
      maxDecimalPlaces,
    })
  ) {
    return { value: previousValue, ok: false };
  }

  return {
    value: formatNormalizedNumericValue({
      normalizedIntegerPart,
      fractionalPart: parsed.fractionalPart,
      hasDecimalSeparator: parsed.hasDecimalSeparator,
      decimalSeparator,
    }),
    ok: true,
  };
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
