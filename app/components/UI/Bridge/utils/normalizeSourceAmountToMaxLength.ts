import { trimTrailingZeros } from './trimTrailingZeros';

export const normalizeSourceAmountToMaxLength = (
  value: string,
  maxInputLength: number,
): string => {
  const normalizedValue = trimTrailingZeros(value);

  // Keep programmatic updates aligned with keypad edits, which now allow raw
  // values up to and including maxInputLength.
  if (normalizedValue.length <= maxInputLength) {
    return normalizedValue;
  }

  const decimalIndex = normalizedValue.indexOf('.');
  if (decimalIndex === -1) {
    return normalizedValue;
  }

  const integerPart = normalizedValue.slice(0, decimalIndex);

  // If the integer part alone is already too long, keep the full value rather
  // than silently changing its magnitude.
  if (integerPart.length > maxInputLength) {
    return normalizedValue;
  }

  if (integerPart.length === maxInputLength) {
    return integerPart;
  }

  const maxDecimalLength = maxInputLength - integerPart.length - 1;
  if (maxDecimalLength <= 0) {
    return integerPart;
  }

  return trimTrailingZeros(
    `${integerPart}.${normalizedValue.slice(
      decimalIndex + 1,
      decimalIndex + 1 + maxDecimalLength,
    )}`,
  );
};
