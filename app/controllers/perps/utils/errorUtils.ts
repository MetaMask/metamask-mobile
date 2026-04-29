/**
 * Utility functions for error handling across the application.
 * These are general-purpose utilities, not domain-specific.
 */
import { hasProperty } from '@metamask/utils';

/**
 * Detects expected cancellation/abort errors that should not be reported to Sentry.
 * These occur during normal navigation or view teardown when in-flight fetch requests
 * are cancelled via AbortController.
 *
 * @param error - The error to check.
 * @returns True if the error is an expected abort/cancellation.
 */
export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.message.includes('signal is aborted') ||
      error.message.includes('The operation was aborted')
    );
  }
  return false;
}

/**
 * Ensures we have a proper Error object for logging.
 * Converts unknown/string errors to proper Error instances.
 * Handles undefined/null specially for better Sentry context.
 *
 * @param error - The caught error (could be Error, string, or unknown)
 * @param context - Optional context string to help identify the source of the error
 * @returns A proper Error instance
 */
export function ensureError(error: unknown, context?: string): Error {
  if (error instanceof Error) {
    return error;
  }
  // Handle undefined/null specifically for better error context
  // e.g. Hyperliquid SDK may reject with undefined when AbortSignal.reason is not set
  if (error === undefined || error === null) {
    const baseMessage = 'Unknown error (no details provided)';
    return new Error(context ? `${baseMessage} [${context}]` : baseMessage);
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error(
    typeof error === 'object' && error !== null && hasProperty(error, 'message')
      ? String((error as { message: unknown }).message)
      : 'Unknown error',
  );
}
