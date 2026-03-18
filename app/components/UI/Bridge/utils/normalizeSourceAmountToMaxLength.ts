import { trimTrailingZeros } from './trimTrailingZeros';

export const normalizeSourceAmountToMaxLength = (
  value: string,
  maxInputLength: number,
): string => {
  const normalizedValue = trimTrailingZeros(value);

  // Cursor-aware keypad edits only accept values whose raw length is strictly
  // below maxInputLength, so programmatic updates should satisfy the same rule.
  if (normalizedValue.length < maxInputLength) {
    return normalizedValue;
  }

  const decimalIndex = normalizedValue.indexOf('.');
  if (decimalIndex === -1) {
    return normalizedValue;
  }

  const integerPart = normalizedValue.slice(0, decimalIndex);
  const maxAllowedLength = maxInputLength - 1;

  // If the integer part alone is already too long, keep the full value rather
  // than silently changing its magnitude.
  if (integerPart.length > maxAllowedLength) {
    return normalizedValue;
  }

  if (integerPart.length === maxAllowedLength) {
    return integerPart;
  }

  const maxDecimalLength = maxAllowedLength - integerPart.length - 1;
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
