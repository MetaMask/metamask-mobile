/**
 * Utility functions for error handling across the application.
 * These are general-purpose utilities, not domain-specific.
 */

/**
 * Ensures we have a proper Error object for logging.
 * Converts unknown/string errors to proper Error instances.
 * Handles undefined/null specially for better Sentry context.
 * @param error - The caught error (could be Error, string, or unknown)
 * @returns A proper Error instance
 */
export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  // Handle undefined/null specifically for better error context
  // e.g. Hyperliquid SDK may reject with undefined when AbortSignal.reason is not set
  if (error === undefined || error === null) {
    return new Error('Unknown error (no details provided)');
  }
  return new Error(String(error));
}
