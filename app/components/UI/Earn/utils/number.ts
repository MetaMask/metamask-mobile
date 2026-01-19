import { isNumber } from '../../../../util/number';

const findFirstDigitIndex = (str: string) => {
  for (let i = 0; i < str.length; i++) {
    if (isNumber(str[i])) {
      return i;
    }
  }

  return -1;
};

// Build numeric string with only digits and at most one decimal point
const buildFloatString = (str: string, firstDigitIndex: number) => {
  const isNegative = firstDigitIndex > 0 && str[firstDigitIndex - 1] === '-';

  // Build numeric string with only digits and at most one decimal point
  let result = isNegative ? '-' : '';
  let hasDecimal = false;
  let hasStartedDigits = false;

  // Check if we need to handle a leading decimal
  if (str.startsWith('.') && firstDigitIndex === 1) {
    result += '0.';
    hasDecimal = true;
  }

  // Process characters
  for (let i = firstDigitIndex; i < str.length; i++) {
    const char = str[i];

    if (isNumber(char)) {
      result += char;
      hasStartedDigits = true;
    } else if (char === '.' && !hasDecimal && hasStartedDigits) {
      result += '.';
      hasDecimal = true;
    } else if (char === '.' && hasDecimal) {
      // Stop at second decimal point. The rest if junk
      break;
    } else if (char === '-' && hasStartedDigits) {
      // Stop at minus sign after digits have started. The rest is junk
      break;
    } else if (char === 'e' || char === 'E') {
      // Stop at 'e' or 'E' to prevent scientific notation
      break;
    }
  }

  return result;
};

/**
 * Safely parses a float from a string, ignoring non-numeric characters.
 * Only keeps the first decimal point and handles negative numbers.
 *
 * Unlike built-in parseFloat, this handles numbers with leading non-numeric characters.
 *
 * @example
 * parseFloatSafe('$55.50') = 55.50
 * parseFloatSafe('-,[]{}()/?*&%$#@!312.12+=-_|;:') = -312.12
 * parseFloatSafe('{}()?-312.12+=-_|;:') = -312.12
 * parseFloatSafe('312.12.34.56') = 312.12
 *
 * @param input The string to parse
 * @returns Parsed number or NaN if no digits found
 */
export const parseFloatSafe = (input: string): number => {
  if (!input) return NaN;

  const str = input.trim();

  // Find the first digit and check if it has a minus sign directly before it
  const firstDigitIndex = findFirstDigitIndex(str);

  // Handle multiple decimals before digits (e.g. ..123.45 is not a valid float)
  const preDigitContent = str.substring(0, firstDigitIndex);
  if (preDigitContent.split('.').length > 2) {
    return NaN;
  }

  const result = buildFloatString(str, firstDigitIndex);

  return parseFloat(result);
};

/**
 * Truncates a number to 2 decimal places and removes trailing zeros (no rounding)
 * @param number - The number to truncate
 * @returns The truncated number
 */
export const truncateNumber = (number: string | number): string => {
  const value = Number(number);
  const truncatedToTwoDecimals = Math.trunc(value * 100) / 100;
  // String() omits trailing zeros
  return String(truncatedToTwoDecimals);
};
