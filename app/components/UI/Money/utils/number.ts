/**
 * Determines if a value is a positive number.
 * Used to avoid littering Money components with these repeated checks.
 *
 * @param value - The value to check.
 * @returns True if the value is a positive number, false otherwise.
 */
export const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && isFinite(value) && value > 0;
