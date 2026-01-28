/**
 * Utility functions for error handling across the application.
 * These are general-purpose utilities, not domain-specific.
 */

/**
 * Ensures we have a proper Error object for logging.
 * Converts unknown/string errors to proper Error instances.
 * @param error - The caught error (could be Error, string, or unknown)
 * @returns A proper Error instance
 */
export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}
