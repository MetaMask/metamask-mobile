import { DECIMAL_PRECISION_CONFIG } from '../constants/perpsConfig';

/**
 * Count significant figures in a price string.
 * Pure math function extracted from formatUtils for portability.
 */
export const countSignificantFigures = (priceString: string): number => {
  if (!priceString) return 0;

  const cleaned = priceString.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num) || num === 0) return 0;

  const normalized = num.toString();
  const [integerPart, decimalPart = ''] = normalized.split('.');
  const trimmedInteger = integerPart.replace(/^-?0*/, '') || '';

  const effectiveIntegerLength = decimalPart
    ? trimmedInteger.length
    : trimmedInteger.replace(/0+$/, '').length ||
      (trimmedInteger.length > 0 ? 1 : 0);

  return effectiveIntegerLength + decimalPart.length;
};

/**
 * Check if a price string exceeds the maximum significant figures.
 */
export const hasExceededSignificantFigures = (
  priceString: string,
  maxSigFigs: number = DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
): boolean => {
  if (!priceString || priceString.trim() === '') return false;

  const cleaned = priceString.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return false;

  const normalized = num.toString();
  if (!normalized.includes('.')) return false;

  return countSignificantFigures(priceString) > maxSigFigs;
};

/**
 * Round a price string to the maximum significant figures.
 */
export const roundToSignificantFigures = (
  priceString: string,
  maxSigFigs: number = DECIMAL_PRECISION_CONFIG.MaxSignificantFigures,
): string => {
  if (!priceString || priceString.trim() === '') return priceString;

  const cleaned = priceString.replace(/[$,]/g, '').trim();
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num) || num === 0) return priceString;

  const normalized = num.toString();
  const [integerPart, decimalPart = ''] = normalized.split('.');

  const trimmedInteger = integerPart.replace(/^-?0*/, '') || '';
  const integerSigFigs = trimmedInteger.length;

  if (!decimalPart) return normalized;

  const allowedDecimalDigits = maxSigFigs - integerSigFigs;

  if (allowedDecimalDigits <= 0) {
    return Math.round(num).toString();
  }

  if (decimalPart.length <= allowedDecimalDigits) {
    return normalized;
  }

  const rounded = num.toFixed(allowedDecimalDigits);
  return Number.parseFloat(rounded).toString();
};
