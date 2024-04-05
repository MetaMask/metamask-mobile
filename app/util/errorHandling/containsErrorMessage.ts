/**
 * Returns a boolean indicating whether the error message contains the specified message.
 *
 * @remarks
 * This function is not case sensitive.
 *
 * @param error - The error to check
 * @param message - The message to check that the error contains
 * @returns A boolean indicating whether the error message contains the specified message
 *
 */
const containsErrorMessage = (error: Error, message: string): boolean =>
  error.toString().toLowerCase().includes(message.toLowerCase());

export default containsErrorMessage;
