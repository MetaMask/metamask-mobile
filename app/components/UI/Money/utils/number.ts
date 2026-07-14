/**
 * Determines if a value is a positive number.
 * Used to avoid littering Money components with these repeated checks.
 *
 * @param value - The value to check.
 * @returns True if the value is a positive number, false otherwise.
 */
export const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && isFinite(value) && value > 0;

/**
 * Determines if a value is a positive number or zero.
 * Used to avoid littering Money components with these repeated checks.
 *
 * @param value - The value to check.
 * @returns True if the value is a positive number or zero, false otherwise.
 */
export const isPositiveNumberOrZero = (value: unknown): value is number =>
  typeof value === 'number' && isFinite(value) && value >= 0;

/**
 * Parses a raw value to a non-negative finite number.
 * @param raw - The raw value to parse.
 * @returns The parsed number, or undefined if the value is not a positive number.
 */
export const parseNonNegativeFinite = (raw: unknown): number | undefined => {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number.parseFloat(raw)
        : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
