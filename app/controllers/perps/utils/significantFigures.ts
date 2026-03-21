import { DECIMAL_PRECISION_CONFIG } from '../constants/perpsConfig';

/**
 * Count significant figures in a price string.
 * Pure math function extracted from formatUtils for portability.
 *
 * @param priceString - The price string to count significant figures for.
 * @returns The number of significant figures in the price string.
 */
export const countSignificantFigures = (priceString: string): number => {
  if (!priceString) {
    return 0;
  }

  const cleaned = priceString.replace(/[$,]/gu, '').trim();
  const number = parseFloat(cleaned);
  if (isNaN(number) || number === 0) {
    return 0;
  }

  const normalized = number.toString();
  const [integerPart, decimalPart = ''] = normalized.split('.');
  const trimmedInteger = integerPart.replace(/^-?0*/u, '') || '';

  const effectiveIntegerLength = decimalPart
    ? trimmedInteger.length
    : trimmedInteger.replace(/0+$/u, '').length ||
      (trimmedInteger.length > 0 ? 1 : 0);

  // For numbers < 1 (e.g. 0.001234), leading zeros after the decimal are not
  // significant figures. Strip them before counting.
  const significantDecimalPart =
    effectiveIntegerLength === 0
      ? decimalPart.replace(/^0+/u, '')
      : decimalPart;

  return effectiveIntegerLength + significantDecimalPart.length;
};

/**
 * Check if a price string exceeds the maximum significant figures.
 *
 * @param priceString - The price string to check.
 * @param maxSigFigs - The maximum allowed significant figures.
 * @returns True if the price string exceeds the maximum significant figures.
 */
export const hasExceededSignificantFigures = (
  priceString: string,
  maxSigFigs: number = DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
): boolean => {
  if (!priceString || priceString.trim() === '') {
    return false;
  }

  const cleaned = priceString.replace(/[$,]/gu, '').trim();
  const number = parseFloat(cleaned);
  if (isNaN(number)) {
    return false;
  }

  const normalized = number.toString();
  if (!normalized.includes('.')) {
    return false;
  }

  return countSignificantFigures(priceString) > maxSigFigs;
};

/**
 * Round a price string to the maximum significant figures.
 *
 * @param priceString - The price string to round.
 * @param maxSigFigs - The maximum allowed significant figures.
 * @returns The price string rounded to the specified significant figures.
 */
export const roundToSignificantFigures = (
  priceString: string,
  maxSigFigs: number = DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
): string => {
  if (!priceString || priceString.trim() === '') {
    return priceString;
  }

  const cleaned = priceString.replace(/[$,]/gu, '').trim();
  const number = Number.parseFloat(cleaned);
  if (Number.isNaN(number) || number === 0) {
    return priceString;
  }

  const normalized = number.toString();
  const [integerPart, decimalPart = ''] = normalized.split('.');

  const trimmedInteger = integerPart.replace(/^-?0*/u, '') || '';
  const integerSigFigs = trimmedInteger.length;

  if (!decimalPart) {
    return normalized;
  }

  // For numbers < 1 (e.g. 0.001234), leading zeros after the decimal are not
  // significant. Count them so we reserve enough decimal places for the actual
  // significant digits that follow (e.g. 0.001234 needs 2 leading zeros + 4 sig figs = 6 decimals).
  const leadingDecimalZeros =
    integerSigFigs === 0 ? (decimalPart.match(/^0+/u)?.[0].length ?? 0) : 0;
  const allowedDecimalDigits =
    maxSigFigs - integerSigFigs + leadingDecimalZeros;

  if (allowedDecimalDigits <= 0) {
    return Math.round(number).toString();
  }

  if (decimalPart.length <= allowedDecimalDigits) {
    return normalized;
  }

  const rounded = number.toFixed(allowedDecimalDigits);
  return Number.parseFloat(rounded).toString();
};
